const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Activity = require('../models/Activity');
const Category = require('../models/Category');


const defaultProductive = ['github.com', 'stackoverflow.com', 'leetcode.com'];
const defaultUnproductive = ['youtube.com', 'instagram.com', 'facebook.com', 'twitter.com', 'reddit.com'];

// Middleware to authenticate JWT
const auth = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Authorization token missing' });
  }
  
  jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret', (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.userId = user.id;
    next();
  });
};


router.post('/login', async (req, res) => {
 
  try {
    const { email, password } = req.body;
    let user = await User.findOne({ email });
    
    if (!user) {
      user = new User({ email, password });
      await user.save();
    } else if (user.password !== password) {
      return res.status(401).json({ error: "Invalid password" });
    }
    
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'fallback_secret');
    res.json({ token, email: user.email });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


router.post('/track', auth, async (req, res) => {
  try {
    const { activities } = req.body;
    if (!activities || !Array.isArray(activities)) {
      return res.status(400).json({ error: "Invalid payload" });
    }

    
    const activitiesToSave = activities
      .filter(act => {
        
        return act && act.duration > 0 && act.domain && act.date;
      })
      .map(act => ({
        userId: req.userId,
        url: act.url || '',
        domain: normalizeDomain(act.domain),
        title: act.title || '',
        startTime: act.startTime || Date.now(),
        endTime: act.endTime || Date.now(),
        duration: Math.max(0, Math.floor(act.duration)), // Ensure non-negative integer
        date: act.date
      }));

    if (activitiesToSave.length === 0) {
      return res.json({ success: true, count: 0, message: 'No valid activities to save' });
    }

    await Activity.insertMany(activitiesToSave);
    res.json({ success: true, count: activitiesToSave.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const normalizeDomain = (domain) => {
  if (!domain) return null;
  return domain.toLowerCase().replace(/^www\./, '');
};

// Helper to classify domains
async function getDomainTypes(userId, domains) {
  const normalizedDomains = domains.map(normalizeDomain).filter(Boolean);
  const userCategories = await Category.find({ userId, domain: { $in: normalizedDomains } });
  const categoryMap = {};
  userCategories.forEach(c => categoryMap[normalizeDomain(c.domain)] = c.type);
  
  normalizedDomains.forEach(d => {
    if (!categoryMap[d]) {
      if (defaultProductive.some(rule => d === rule || d.endsWith(`.${rule}`))) categoryMap[d] = 'productive';
      else if (defaultUnproductive.some(rule => d === rule || d.endsWith(`.${rule}`))) categoryMap[d] = 'unproductive';
      else categoryMap[d] = 'neutral';
    }
  });
  
  return categoryMap;
}

router.get('/analytics/today', auth, async (req, res) => {
  try {
    const date = new Date().toISOString().split('T')[0];
    const activities = await Activity.find({ userId: req.userId, date });
    
    if (activities.length === 0) {
      return res.json({ totalTime: 0, productiveTime: 0, unproductiveTime: 0, neutralTime: 0 });
    }
    
    let totalTime = 0;
    let productiveTime = 0;
    let unproductiveTime = 0;
    let neutralTime = 0;
    
    const domains = [...new Set(activities.map(a => a.domain).filter(Boolean))];
    const domainTypes = await getDomainTypes(req.userId, domains);
    
    activities.forEach(act => {
      const normalizedDomain = normalizeDomain(act.domain);
      const duration = act.duration || 0;
      totalTime += duration;
      
      const type = domainTypes[normalizedDomain];
      if (type === 'productive') productiveTime += duration;
      else if (type === 'unproductive') unproductiveTime += duration;
      else neutralTime += duration;
    });

    res.json({ totalTime, productiveTime, unproductiveTime, neutralTime });
  } catch (error) {
    console.error('Analytics today error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/analytics/weekly', auth, async (req, res) => {
  try {
    
    const dates = [];
    for(let i=6; i>=0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dates.push(d.toISOString().split('T')[0]);
    }
    
    const activities = await Activity.find({ 
      userId: req.userId, 
      date: { $gte: dates[0], $lte: dates[6] } 
    });
    
    if (activities.length === 0) {
      return res.json({ 
        chartData: dates.map(date => ({ date, productive: 0, unproductive: 0, neutral: 0 })),
        topSites: []
      });
    }
    
    const domains = [...new Set(activities.map(a => a.domain).filter(Boolean))];
    const domainTypes = await getDomainTypes(req.userId, domains);
    
    // Group by day
    const dailyData = dates.reduce((acc, date) => {
      acc[date] = { productive: 0, unproductive: 0, neutral: 0, total: 0 };
      return acc;
    }, {});
    
    const domainUsage = {};

    activities.forEach(act => {
      const normalizedDomain = normalizeDomain(act.domain);
      const duration = act.duration || 0;
      const type = domainTypes[normalizedDomain];
      
      if(dailyData[act.date]) {
        dailyData[act.date].total += duration;
        if (type === 'productive') dailyData[act.date].productive += duration;
        else if (type === 'unproductive') dailyData[act.date].unproductive += duration;
        else dailyData[act.date].neutral += duration;
      }
      
      domainUsage[normalizedDomain] = (domainUsage[normalizedDomain] || 0) + duration;
    });
    
    const chartData = dates.map(date => ({
      date,
      productive: Math.round((dailyData[date].productive || 0) / 60), // minutes
      unproductive: Math.round((dailyData[date].unproductive || 0) / 60),
      neutral: Math.round((dailyData[date].neutral || 0) / 60)
    }));
    
    // Top sites
    const topSites = Object.keys(domainUsage)
      .filter(Boolean)
      .map(d => ({ domain: d, time: domainUsage[d], type: domainTypes[d] }))
      .sort((a, b) => b.time - a.time)
      .slice(0, 10);
      
    res.json({ chartData, topSites });
  } catch (error) {
    console.error('Analytics weekly error:', error);
    res.status(500).json({ error: error.message });
  }
});

const validCategoryTypes = ['productive', 'unproductive', 'neutral'];

router.post('/classification', auth, async (req, res) => {
  try {
    const { domain, type } = req.body;
    const normalizedDomain = normalizeDomain(domain);

    if (!normalizedDomain) {
      return res.status(400).json({ error: 'Invalid domain' });
    }

    if (!type || !validCategoryTypes.includes(type)) {
      return res.status(400).json({ error: 'Invalid category type' });
    }

    const category = await Category.findOneAndUpdate(
      { userId: req.userId, domain: normalizedDomain },
      { userId: req.userId, domain: normalizedDomain, type },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
    );

    res.json({ success: true, category });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/classification/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const deletion = await Category.deleteOne({ _id: id, userId: req.userId });
    if (deletion.deletedCount === 0) {
      return res.status(404).json({ error: 'Rule not found' });
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/classification', auth, async (req, res) => {
  try {
    const customCategories = await Category.find({ userId: req.userId });
    res.json({ customCategories, defaultProductive, defaultUnproductive });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
