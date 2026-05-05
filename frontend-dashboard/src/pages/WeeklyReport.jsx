import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Activity, Clock, Target, AlertCircle, Download, TrendingUp, TrendingDown } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import jsPDF from 'jspdf';

const API_URL = 'http://localhost:5000/api';

const WeeklyReport = () => {
  const [weeklyData, setWeeklyData] = useState([]);
  const [topSites, setTopSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const getToken = () => {
    const token = localStorage.getItem('token');
    return token && token !== 'null' && token !== 'undefined' ? token : null;
  };

  const getLast7Days = () => {
    const dates = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dates.push(d.toISOString().split('T')[0]);
    }
    return dates;
  };

  useEffect(() => {
    const fetchWeeklyData = async () => {
      try {
        const token = getToken();
        if (!token) {
          localStorage.removeItem('token');
          window.location.href = '/login';
          return;
        }

        const headers = { Authorization: `Bearer ${token}` };
        const response = await axios.get(`${API_URL}/analytics/weekly`, { headers });
        const rawData = Array.isArray(response.data.chartData) ? response.data.chartData : [];
        const dates = getLast7Days();
        const normalizedWeeklyData = dates.map((date) => {
          const existingDay = rawData.find((item) => item.date === date);
          return {
            date,
            productive: Number(existingDay?.productive || 0),
            unproductive: Number(existingDay?.unproductive || 0),
            neutral: Number(existingDay?.neutral || 0)
          };
        });

        setWeeklyData(normalizedWeeklyData);
        setTopSites(Array.isArray(response.data.topSites) ? response.data.topSites : []);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching weekly data', err);
        if (err.response?.status === 401 || err.response?.status === 403) {
          localStorage.removeItem('token');
          window.location.href = '/login';
          return;
        }
        setError('Unable to load weekly report. Please try again.');
        toast.error('Failed to load weekly report');
        setLoading(false);
      }
    };
    fetchWeeklyData();
  }, []);

  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h === 0 && m === 0) {
      return `${s}s`;
    }
    if (h === 0) {
      return `${m}m ${s}s`;
    }
    return `${h}h ${m}m ${s}s`;
  };

  const formatTimeFromMinutes = (minutes) => {
    const seconds = minutes * 60;
    return formatTime(seconds);
  };

  const getTotalTime = () => {
    return weeklyData.reduce((sum, day) => sum + (day.productive + day.unproductive + (day.neutral || 0)), 0);
  };

  const getProductiveTime = () => {
    return weeklyData.reduce((sum, day) => sum + day.productive, 0);
  };

  const getUnproductiveTime = () => {
    return weeklyData.reduce((sum, day) => sum + day.unproductive, 0);
  };

  const getProductivityScore = () => {
    const total = getTotalTime();
    return total > 0 ? Math.round((getProductiveTime() / total) * 100) : 0;
  };

  const generateInsights = () => {
    const total = getTotalTime();
    const productive = getProductiveTime();
    const unproductive = getUnproductiveTime();
    const neutral = total - productive - unproductive;
    const score = getProductivityScore();

    const insights = [];
    if (score > 70) {
      insights.push("Great job! Your productivity score is excellent this week.");
    } else if (score < 50) {
      insights.push("Consider reviewing your time allocation to improve productivity.");
    }

    if (unproductive > productive) {
      insights.push("You spent more time on unproductive activities this week.");
    }
    if (neutral > productive && neutral > unproductive) {
      insights.push("A large portion of your time is unclassified neutral activity.");
    }

    const topUnproductive = topSites.filter(site => site.type === 'unproductive').slice(0, 2);
    if (topUnproductive.length > 0) {
      insights.push(`Watch out for ${topUnproductive[0].domain} - it's taking up significant time.`);
    }

    return insights;
  };

  const downloadPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text('Weekly Productivity Report', 20, 30);

    doc.setFontSize(12);
    doc.text(`Total Time: ${formatTimeFromMinutes(getTotalTime())}`, 20, 50);
    doc.text(`Productive Time: ${formatTimeFromMinutes(getProductiveTime())}`, 20, 60);
    doc.text(`Unproductive Time: ${formatTimeFromMinutes(getUnproductiveTime())}`, 20, 70);
    doc.text(`Productivity Score: ${getProductivityScore()}%`, 20, 80);

    doc.text('Top Websites:', 20, 100);
    topSites.slice(0, 5).forEach((site, index) => {
      doc.text(`${index + 1}. ${site.domain} - ${formatTime(site.time)} (${site.type})`, 20, 110 + index * 10);
    });

    doc.text('Insights:', 20, 170);
    generateInsights().forEach((insight, index) => {
      doc.text(`• ${insight}`, 20, 180 + index * 10);
    });

    doc.save('weekly-report.pdf');
    toast.success('PDF downloaded successfully');
  };

  const downloadCSV = () => {
    const csvContent = [
      ['Date', 'Productive (minutes)', 'Unproductive (minutes)', 'Neutral (minutes)'],
      ...weeklyData.map(day => [day.date, day.productive, day.unproductive, day.neutral || 0]),
      [],
      ['Top Websites'],
      ['Domain', 'Time (seconds)', 'Type'],
      ...topSites.map(site => [site.domain, site.time, site.type])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'weekly-report.csv';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV downloaded successfully');
  };

  if (loading) {
    return (
      <div className="space-y-8 animate-in fade-in duration-500">
        <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-1/4 animate-pulse"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 animate-pulse">
              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4 mb-2"></div>
              <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-500 mt-20">
        {error}
      </div>
    );
  }

  const pieData = [
    { name: 'Productive', value: getProductiveTime(), color: '#10b981' },
    { name: 'Unproductive', value: getUnproductiveTime(), color: '#ef4444' },
    { name: 'Neutral', value: getTotalTime() - getProductiveTime() - getUnproductiveTime(), color: '#64748b' }
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <Toaster position="top-right" />
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Weekly Report</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Your productivity insights for the past 7 days.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={downloadPDF} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-all">
            <Download size={16} />
            Download PDF
          </button>
          <button onClick={downloadCSV} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-all">
            <Download size={16} />
            Download CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Time" value={formatTimeFromMinutes(getTotalTime())} icon={<Clock />} color="blue" />
        <StatCard title="Productive Time" value={formatTimeFromMinutes(getProductiveTime())} icon={<Target />} color="green" />
        <StatCard title="Unproductive Time" value={formatTimeFromMinutes(getUnproductiveTime())} icon={<AlertCircle />} color="red" />
        <StatCard title="Productivity Score" value={`${getProductivityScore()}%`} icon={<Activity />} color="purple" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-6">Daily Breakdown</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.2} />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#64748b'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b'}} />
                <Tooltip cursor={{fill: 'transparent'}} contentStyle={{backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#f8fafc'}} />
                <Bar dataKey="productive" stackId="a" fill="#10b981" radius={[0, 0, 4, 4]} />
                <Bar dataKey="unproductive" stackId="a" fill="#ef4444" />
                <Bar dataKey="neutral" stackId="a" fill="#64748b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-6">Productivity Ratio</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
        <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-6">Top Websites</h2>
        <div className="space-y-4">
          {topSites.slice(0, 5).map((site, index) => (
            <div key={index} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${site.type === 'productive' ? 'bg-emerald-500' : site.type === 'unproductive' ? 'bg-red-500' : 'bg-slate-400'}`}></div>
                <span className="text-slate-700 dark:text-slate-300 font-medium truncate max-w-[150px]">{site.domain}</span>
              </div>
              <span className="text-slate-500 dark:text-slate-400 text-sm">{formatTime(site.time)}</span>
            </div>
          ))}
          {topSites.length === 0 && <p className="text-sm text-slate-500">No activity yet.</p>}
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
        <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-6">Insights</h2>
        <div className="space-y-3">
          {generateInsights().map((insight, index) => (
            <div key={index} className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-blue-500 mt-2"></div>
              <p className="text-slate-700 dark:text-slate-300">{insight}</p>
            </div>
          ))}
          {generateInsights().length === 0 && <p className="text-sm text-slate-500">No insights available.</p>}
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ title, value, icon, color }) => {
  const colorMap = {
    blue: 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400',
    green: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400',
    red: 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400',
    purple: 'bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400'
  };

  return (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex items-center gap-4 hover:-translate-y-1 transition-transform duration-300">
      <div className={`p-4 rounded-xl ${colorMap[color]}`}>
        {icon}
      </div>
      <div>
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</p>
        <p className="text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
      </div>
    </div>
  );
};

export default WeeklyReport;