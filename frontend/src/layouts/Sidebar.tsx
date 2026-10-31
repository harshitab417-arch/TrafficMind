import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Map,
  Database,
  BarChart2,
  GitBranch,
  Layers,
  Tag,
  TrendingUp,
  AlertTriangle,
  Award,
  Zap,
  X,
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

interface NavItem {
  name: string;
  path: string;
  icon: React.ElementType;
}

const navItems: NavItem[] = [
  { name: 'Overview', path: '/', icon: LayoutDashboard },
  { name: 'Traffic Explorer', path: '/explorer', icon: Map },
  { name: 'Data Management', path: '/data', icon: Database },
  { name: 'OLAP Analytics', path: '/olap', icon: BarChart2 },
  { name: 'Association Mining', path: '/association', icon: GitBranch },
  { name: 'Clustering Analysis', path: '/clustering', icon: Layers },
  { name: 'Congestion Classification', path: '/classification', icon: Tag },
  { name: 'Traffic Prediction', path: '/prediction', icon: TrendingUp },
  { name: 'Outlier Detection', path: '/outliers', icon: AlertTriangle },
  { name: 'Model Evaluation', path: '/evaluation', icon: Award },
];

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs lg:hidden"
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex flex-col w-64 bg-slate-900 text-slate-300 transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="flex items-center justify-between h-16 px-5 border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <Zap className="w-5 h-5 fill-current" />
            </div>
            <div>
              <span className="text-lg font-bold text-white tracking-tight">Traffic</span>
              <span className="text-lg font-bold text-blue-400 tracking-tight">Mind</span>
              <span className="block text-[10px] text-slate-400 font-medium uppercase tracking-wider">
                Analytics Platform
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 lg:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation list */}
        <div className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <div className="px-3 pb-2 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
            Data Mining Modules
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => {
                  if (window.innerWidth < 1024) onClose();
                }}
                className={({ isActive }) =>
                  `flex items-center px-3 py-2.5 text-xs font-medium rounded-lg transition-colors group ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`
                }
              >
                <Icon className="w-4 h-4 mr-3 flex-shrink-0" />
                <span className="truncate">{item.name}</span>
              </NavLink>
            );
          })}
        </div>

        {/* Footer info */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/40">
          <div className="flex items-center space-x-2 text-xs text-slate-400">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
            <span className="font-medium text-slate-300">v1.0.0 Production</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Urban Data Mining Suite
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
