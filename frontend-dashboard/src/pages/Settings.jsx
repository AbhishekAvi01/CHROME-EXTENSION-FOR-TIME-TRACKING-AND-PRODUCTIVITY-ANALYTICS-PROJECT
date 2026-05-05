import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Plus, Trash2 } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

const API_URL = 'http://localhost:5000/api';

const Settings = () => {
  const [categories, setCategories] = useState([]);
  const [newDomain, setNewDomain] = useState('');
  const [newType, setNewType] = useState('productive');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const getToken = () => {
    const token = localStorage.getItem('token');
    return token && token !== 'null' && token !== 'undefined' ? token : null;
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const token = getToken();
      if (!token) {
        localStorage.removeItem('token');
        navigate('/login');
        return;
      }

      const res = await axios.get(`${API_URL}/classification`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCategories(res.data.customCategories || []);
      setLoading(false);
    } catch (error) {
      console.error(error);
      if (error.response?.status === 401 || error.response?.status === 403) {
        localStorage.removeItem('token');
        navigate('/login');
        return;
      }
      setLoading(false);
    }
  };

  const handleAddRule = async (e) => {
    e.preventDefault();
    if (!newDomain) return;
    
    try {
      const token = getToken();
      if (!token) {
        localStorage.removeItem('token');
        navigate('/login');
        return;
      }

      await axios.post(`${API_URL}/classification`, {
        domain: newDomain.toLowerCase(),
        type: newType
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setNewDomain('');
      fetchCategories();
      toast.success('Rule added successfully');
    } catch (error) {
      console.error(error);
      if (error.response?.status === 401 || error.response?.status === 403) {
        localStorage.removeItem('token');
        navigate('/login');
      } else {
        toast.error('Failed to add rule');
      }
    }
  };

  const handleDeleteCategory = async (id) => {
    try {
      const token = getToken();
      if (!token) {
        localStorage.removeItem('token');
        navigate('/login');
        return;
      }

      await axios.delete(`${API_URL}/classification/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setCategories((prev) => prev.filter((cat) => cat._id !== id));
      toast.success('Rule deleted successfully');
    } catch (error) {
      console.error(error);
      if (error.response?.status === 401 || error.response?.status === 403) {
        localStorage.removeItem('token');
        navigate('/login');
      } else {
        toast.error('Failed to delete rule');
      }
    }
  };

  if (loading) return <div className="text-center text-slate-500 mt-20">Loading settings...</div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-4xl">
      <Toaster position="top-right" />
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Settings</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Manage your website classifications and rules.</p>
      </div>

      <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
        <h2 className="text-xl font-semibold text-slate-800 dark:text-white mb-6">Classification Rules</h2>
        
        <form onSubmit={handleAddRule} className="flex flex-col sm:flex-row gap-4 mb-8">
          <input
            type="text"
            placeholder="e.g. reddit.com"
            value={newDomain}
            onChange={(e) => setNewDomain(e.target.value)}
            className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all"
            required
          />
          <select
            value={newType}
            onChange={(e) => setNewType(e.target.value)}
            className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all"
          >
            <option value="productive">Productive</option>
            <option value="unproductive">Unproductive</option>
            <option value="neutral">Neutral</option>
          </select>
          <button type="submit" className="bg-brand-600 hover:bg-brand-700 text-white px-6 py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-all">
            <Plus size={20} />
            <span>Add Rule</span>
          </button>
        </form>

        <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/50">
                <th className="px-6 py-4 text-sm font-semibold text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">Domain</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">Classification</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {categories.length === 0 ? (
                <tr>
                  <td colSpan="3" className="px-6 py-8 text-center text-slate-500 dark:text-slate-400">No custom rules added yet.</td>
                </tr>
              ) : categories.map((cat) => (
                <tr key={cat._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="px-6 py-4 text-slate-900 dark:text-slate-200 font-medium">{cat.domain}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium capitalize
                      ${cat.type === 'productive' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-400' : 
                        cat.type === 'unproductive' ? 'bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-400' : 
                        'bg-slate-100 text-slate-800 dark:bg-slate-500/20 dark:text-slate-400'}`}>
                      {cat.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      type="button"
                      onClick={() => handleDeleteCategory(cat._id)}
                      className="text-slate-400 hover:text-red-500 transition-colors p-2"
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Settings;
