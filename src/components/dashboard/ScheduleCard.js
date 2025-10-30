"use client";
import { MoreHorizontal } from "lucide-react";

export default function ScheduleCard() {
  const upcomingSchedule = [
    { day: 'Su', date: '', active: false },
    { day: 'Mo', date: '', active: false },
    { day: 'Tu', date: '', active: false },
    { day: 'We', date: '', active: false },
    { day: 'Th', date: '14', active: true },
    { day: 'Fr', date: '15', active: false },
    { day: 'Sa', date: '16', active: false },
  ];

  return (
    <div className="lg:col-span-4">
      <div className="bg-white rounded-2xl p-6 border border-gray-100">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Delivery Schedule</h3>
          <MoreHorizontal className="w-4 h-4 text-gray-400" />
        </div>
        
        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-2 mb-6">
          {upcomingSchedule.map((day, index) => (
            <div key={index} className="text-center">
              <p className="text-xs text-gray-500 mb-2">{day.day}</p>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm ${
                day.active 
                  ? 'bg-gray-900 text-white font-medium' 
                  : 'text-gray-400'
              }`}>
                {day.date}
              </div>
            </div>
          ))}
        </div>

        {/* Calendar dates */}
        <div className="grid grid-cols-7 gap-2 text-xs text-gray-500">
          <div></div><div></div><div className="text-teal-600 font-medium">3</div>
          <div className="text-teal-600 font-medium">4</div><div className="text-red-500 font-medium">5</div>
          <div className="text-teal-600 font-medium">6</div><div className="text-red-500 font-medium">7</div>
          
          <div className="text-red-500 font-medium">8</div><div className="text-teal-600 font-medium">9</div>
          <div className="text-teal-600 font-medium">10</div><div className="text-teal-600 font-medium">11</div>
          <div className="text-teal-600 font-medium">12</div><div className="text-teal-600 font-medium">13</div>
          <div className="bg-gray-900 text-white rounded w-6 h-6 flex items-center justify-center font-medium">14</div>

          <div className="text-red-500 font-medium">15</div><div className="text-teal-600 font-medium">16</div>
          <div className="text-gray-400">17</div><div className="text-gray-400">18</div>
          <div className="text-gray-400">19</div><div className="text-gray-400">20</div>
          <div className="text-gray-400">21</div>

          <div className="text-red-500 font-medium">22</div><div className="text-gray-400">23</div>
          <div className="text-gray-400">24</div><div className="text-gray-400">25</div>
          <div className="text-gray-400">26</div><div className="text-gray-400">27</div>
          <div className="text-gray-400">28</div>

          <div className="text-red-500 font-medium">29</div><div className="text-gray-400">30</div>
        </div>
      </div>
    </div>
  );
}
