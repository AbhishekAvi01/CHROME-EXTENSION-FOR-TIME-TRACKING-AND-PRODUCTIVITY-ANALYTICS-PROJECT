import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Activity, Clock, Target, AlertCircle, Download, TrendingUp, TrendingDown } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import jsPDF from 'jspdf';

const API_URL = 'http://localhost:5000/api';

const Dashboard = () => {
  const [todayStats, setTodayStats] = useState({ totalTime: 0, productiveTime: 0, unproductiveTime: 0, neutralTime: 0 });
  const [weeklyData, setWeeklyData] = useState([]);
  const [topSites, setTopSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState('');
  const navigate = useNavigate();

  const getToken = () => {
    const token = localStorage.getItem('token');
    return token && token !== 'null' && token !== 'undefined' ? token : null;
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = getToken();
        if (!token) {
          localStorage.removeItem('token');
          navigate('/login');
          return;
        }

        const headers = { Authorization: `Bearer ${token}` };

        const [todayRes, weeklyRes] = await Promise.all([
          axios.get(`${API_URL}/analytics/today`, { headers }),
          axios.get(`${API_URL}/analytics/weekly`, { headers })
        ]);

        setTodayStats(todayRes.data);
        setWeeklyData(weeklyRes.data.chartData);
        setTopSites(weeklyRes.data.topSites);
        setLoading(false);
        setApiError('');
      } catch (error) {
        console.error('Error fetching data', error);
        if (error.response?.status === 401 || error.response?.status === 403) {
          localStorage.removeItem('token');
          navigate('/login');
          return;
        }
        setApiError('Unable to load analytics. Please sign in again or try again later.');
        toast.error('Failed to load dashboard data');
        setLoading(false);
      }
    };
    
    fetchData();
    
    // Refresh data every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [navigate]);

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

  const getProductivityScore = () => {
    if (todayStats.totalTime === 0) return 0;
    return Math.round((todayStats.productiveTime / todayStats.totalTime) * 100);
  };

  const downloadTodayPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text('Today\'s Productivity Report', 20, 30);

    doc.setFontSize(12);
    doc.text(`Total Time: ${formatTime(todayStats.totalTime)}`, 20, 50);
    doc.text(`Productive Time: ${formatTime(todayStats.productiveTime)}`, 20, 60);
    doc.text(`Unproductive Time: ${formatTime(todayStats.unproductiveTime)}`, 20, 70);
    doc.text(`Productivity Score: ${getProductivityScore()}%`, 20, 80);

    doc.save('today-report.pdf');
    toast.success('PDF downloaded successfully');
  };

  const pieData = [
    { name: 'Productive', value: todayStats.productiveTime, color: '#10b981' },
    { name: 'Unproductive', value: todayStats.unproductiveTime, color: '#ef4444' },
    { name: 'Neutral', value: todayStats.neutralTime, color: '#64748b' }
  ];

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

  if (apiError) return <div className="text-center text-red-500 mt-20">{apiError}</div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <Toaster position="top-right" />
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Overview</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Here's what your productivity looks like today.</p>
        </div>
        <button onClick={downloadTodayPDF} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-all">
          <Download size={16} />
          Download Today
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Tracked Time" value={formatTime(todayStats.totalTime)} icon={<Clock />} color="blue" trend={null} />
        <StatCard title="Productive Time" value={formatTime(todayStats.productiveTime)} icon={<Target />} color="green" trend={null} />
        <StatCard title="Unproductive Time" value={formatTime(todayStats.unproductiveTime)} icon={<AlertCircle />} color="red" trend={null} />
        <StatCard title="Neutral Time" value={formatTime(todayStats.neutralTime)} icon={<Activity />} color="purple" trend={null} />
        <StatCard title="Productivity Score" value={`${getProductivityScore()}%`} icon={<Activity />} color="blue" trend={null} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-6">Weekly Activity (Minutes)</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.2} />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#64748b'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b'}} />
                <Tooltip cursor={{fill: 'transparent'}} contentStyle={{backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#f8fafc'}} />
                <Bar dataKey="productive" stackId="a" fill="#10b981" radius={[0, 0, 4, 4]} />
                <Bar dataKey="unproductive" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-6">Today's Ratio</h2>
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
          {topSites.map((site, index) => (
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
    </div>
  );
};

const StatCard = ({ title, value, icon, color, trend }) => {
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
      <div className="flex-1">
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</p>
        <p className="text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
        {trend && (
          <div className="flex items-center gap-1 mt-1">
            {trend > 0 ? <TrendingUp size={14} className="text-green-500" /> : <TrendingDown size={14} className="text-red-500" />}
            <span className={`text-xs ${trend > 0 ? 'text-green-500' : 'text-red-500'}`}>
              {Math.abs(trend)}% from yesterday
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
