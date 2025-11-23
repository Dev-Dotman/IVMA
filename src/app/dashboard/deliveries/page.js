"use client";
import { useState, useEffect } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import DeliveryDetailsPanel from "@/components/dashboard/DeliveryDetailsPanel";
import { useAuth } from "@/contexts/AuthContext";
import { 
  Calendar, 
  Truck, 
  Clock, 
  MapPin, 
  Phone, 
  Package,
  ChevronLeft,
  ChevronRight,
  Plus,
  Filter,
  CheckCircle,
  AlertTriangle,
  XCircle,
  User,
  Eye
} from "lucide-react";

export default function DeliveriesPage() {
  const { secureApiCall } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [deliveries, setDeliveries] = useState([]);
  const [monthDeliveries, setMonthDeliveries] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedDelivery, setSelectedDelivery] = useState(null);
  const [isDetailsPanelOpen, setIsDetailsPanelOpen] = useState(false);

  // Fetch deliveries for selected date
  const fetchDeliveriesForDate = async (date) => {
    try {
      // Format date as YYYY-MM-DD in local timezone
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      
      const response = await secureApiCall(`/api/deliveries?date=${dateStr}`);
      if (response.success) {
        setDeliveries(response.data);
      }
    } catch (error) {
      console.error('Error fetching deliveries:', error);
    }
  };

  // Fetch deliveries for current month (for calendar dots)
  const fetchMonthDeliveries = async (date) => {
    try {
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const response = await secureApiCall(`/api/deliveries?year=${year}&month=${month}`);
      if (response.success) {
        setMonthDeliveries(response.data);
      }
    } catch (error) {
      console.error('Error fetching month deliveries:', error);
    }
  };

  // Fetch delivery stats
  const fetchStats = async () => {
    try {
      const response = await secureApiCall('/api/deliveries/stats');
      if (response.success) {
        setStats(response.data);
      }
    } catch (error) {
      console.error('Error fetching delivery stats:', error);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        fetchDeliveriesForDate(selectedDate),
        fetchMonthDeliveries(currentDate),
        fetchStats()
      ]);
      setLoading(false);
    };
    loadData();
  }, [selectedDate, currentDate]);

  // Calendar helper functions
  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const isSameDay = (date1, date2) => {
    return date1.toDateString() === date2.toDateString();
  };

  const isToday = (date) => {
    return isSameDay(date, new Date());
  };

  // Get deliveries count for a specific date - FIXED for timezone issues
  const getDeliveriesCountForDate = (date) => {
    // Convert the calendar date to YYYY-MM-DD format in local timezone
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    
    return monthDeliveries.filter(delivery => {
      // Parse the scheduled date and convert to local date string
      const scheduledDate = new Date(delivery.scheduledDate);
      const scheduledYear = scheduledDate.getFullYear();
      const scheduledMonth = String(scheduledDate.getMonth() + 1).padStart(2, '0');
      const scheduledDay = String(scheduledDate.getDate()).padStart(2, '0');
      const scheduledDateStr = `${scheduledYear}-${scheduledMonth}-${scheduledDay}`;
      
      return scheduledDateStr === dateStr;
    }).length;
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0
    }).format(amount);
  };

  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'delivered': return 'text-green-600 bg-green-100';
      case 'scheduled': return 'text-blue-600 bg-blue-100';
      case 'in_transit': return 'text-orange-600 bg-orange-100';
      case 'failed': return 'text-red-600 bg-red-100';
      case 'cancelled': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  // Get status icon
  const getStatusIcon = (status) => {
    switch (status) {
      case 'delivered': return CheckCircle;
      case 'scheduled': return Clock;
      case 'in_transit': return Truck;
      case 'failed': return XCircle;
      case 'cancelled': return XCircle;
      default: return Clock;
    }
  };

  // Navigate calendar
  const navigateMonth = (direction) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(currentDate.getMonth() + direction);
    setCurrentDate(newDate);
  };

  // Handle date selection
  const handleDateSelect = (day) => {
    const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    setSelectedDate(newDate);
  };

  // Handle view delivery details
  const handleViewDetails = (delivery) => {
    setSelectedDelivery(delivery);
    setIsDetailsPanelOpen(true);
  };

  // Close details panel
  const closeDetailsPanel = () => {
    setIsDetailsPanelOpen(false);
    setSelectedDelivery(null);
  };

  // Generate calendar days
  const generateCalendarDays = () => {
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);
    const days = [];

    // Empty cells for days before month starts
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }

    return days;
  };

  const calendarDays = generateCalendarDays();
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  if (loading) {
    return (
      <DashboardLayout title="Delivery Calendar" subtitle="Manage your delivery schedule">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading delivery calendar...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Delivery Calendar" subtitle="Manage your delivery schedule">
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-2xl p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Today's Deliveries</p>
                <p className="text-2xl font-bold text-gray-900">{stats.todayDeliveries}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-xl">
                <Truck className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-700 mb-1 font-medium">Pending</p>
                <p className="text-3xl font-bold text-orange-900">{stats.scheduledDeliveries}</p>
              </div>
              <div className="p-3 bg-orange-100 rounded-xl">
                <Clock className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-700 mb-1 font-medium">Completed</p>
                <p className="text-3xl font-bold text-green-900">{stats.completedDeliveries}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-xl">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-700 mb-1 font-medium">Overdue</p>
                <p className="text-3xl font-bold text-red-900">{stats.overdueDeliveries}</p>
              </div>
              <div className="p-4 bg-red-600 rounded-2xl shadow-lg">
                <AlertTriangle className="w-7 h-7 text-white" />
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Calendar Section */}
        <div className="lg:col-span-2">
          <div className="bg-gradient-to-br from-white to-gray-50 rounded-3xl p-8 border border-gray-200 shadow-lg">
            {/* Calendar Header */}
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-teal-100 rounded-2xl">
                  <Calendar className="w-6 h-6 text-teal-600" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">
                    {monthNames[currentDate.getMonth()]}
                  </h3>
                  <p className="text-sm text-gray-500">{currentDate.getFullYear()}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="flex items-center bg-white rounded-xl border border-gray-200 shadow-sm">
                  <button
                    onClick={() => navigateMonth(-1)}
                    className="p-3 hover:bg-gray-50 rounded-l-xl transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5 text-gray-600" />
                  </button>
                  <div className="w-px h-6 bg-gray-200"></div>
                  <button
                    onClick={() => navigateMonth(1)}
                    className="p-3 hover:bg-gray-50 rounded-r-xl transition-colors"
                  >
                    <ChevronRight className="w-5 h-5 text-gray-600" />
                  </button>
                </div>
                <button
                  onClick={() => setCurrentDate(new Date())}
                  className="px-5 py-3 text-sm font-medium bg-gradient-to-r from-teal-600 to-teal-700 text-white rounded-xl hover:from-teal-700 hover:to-teal-800 transition-all shadow-md hover:shadow-lg"
                >
                  Today
                </button>
              </div>
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-2 mb-3">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="p-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-2">
              {calendarDays.map((day, index) => {
                if (!day) {
                  return <div key={index} className="aspect-square"></div>;
                }

                const cellDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
                const deliveriesCount = getDeliveriesCountForDate(cellDate);
                const isSelected = isSameDay(cellDate, selectedDate);
                const isTodayDate = isToday(cellDate);

                return (
                  <button
                    key={index}
                    onClick={() => handleDateSelect(day)}
                    className={`aspect-square p-2 text-sm font-medium rounded-2xl transition-all relative flex items-center justify-center ${
                      isSelected
                        ? 'bg-gradient-to-br from-teal-600 to-teal-700 text-white shadow-teal-200 scale-105'
                        : isTodayDate
                        ? 'bg-gradient-to-br from-teal-100 to-teal-50 text-teal-800 border-2 border-teal-300'
                        : deliveriesCount > 0
                        ? 'bg-white hover:bg-teal-50 text-gray-900 border border-teal-200 hover:border-teal-300 shadow-sm'
                        : 'bg-white hover:bg-gray-50 text-gray-600 border border-gray-100'
                    }`}
                  >
                    <span className={isSelected || isTodayDate ? 'font-bold' : ''}>{day}</span>
                    {deliveriesCount > 0 && (
                      <div className={`absolute -top-1 -right-1 min-w-[22px] h-[22px] px-1 text-xs font-bold rounded-full flex items-center justify-center shadow-md ${
                        isSelected 
                          ? 'bg-white text-teal-600' 
                          : 'bg-gradient-to-br from-teal-600 to-teal-700 text-white'
                      }`}>
                        {deliveriesCount}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex items-center justify-center space-x-6 mt-8 pt-6 border-t border-gray-200">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-gradient-to-br from-teal-100 to-teal-50 border-2 border-teal-300 rounded"></div>
                <span className="text-xs text-gray-600">Today</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-gradient-to-br from-teal-600 to-teal-700 rounded shadow-sm"></div>
                <span className="text-xs text-gray-600">Selected</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-white border border-teal-200 rounded relative">
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-teal-600 rounded-full"></div>
                </div>
                <span className="text-xs text-gray-600">Has Deliveries</span>
              </div>
            </div>
          </div>
        </div>

        {/* Selected Date Deliveries */}
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-white to-gray-50 rounded-3xl p-6 border border-gray-200 shadow-lg sticky top-6">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  {selectedDate.toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric'
                  })}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {selectedDate.getFullYear()}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <span className="px-4 py-2 bg-gradient-to-r from-teal-600 to-teal-700 text-white text-sm font-semibold rounded-xl shadow-md">
                  {deliveries.length}
                </span>
                <span className="text-sm text-gray-600 font-medium">
                  {deliveries.length === 1 ? 'delivery' : 'deliveries'}
                </span>
              </div>
            </div>

            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
              {deliveries.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-50 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-inner">
                    <Calendar className="w-10 h-10 text-gray-300" />
                  </div>
                  <p className="text-gray-600 font-medium mb-1">No deliveries scheduled</p>
                  <p className="text-gray-400 text-xs">Select a date with deliveries to view details</p>
                </div>
              ) : (
                deliveries.map((delivery) => {
                  const StatusIcon = getStatusIcon(delivery.status);
                  return (
                    <div 
                      key={delivery._id} 
                      className="bg-white border-2 border-gray-100 rounded-2xl p-4 hover:border-teal-300 hover:shadow-md transition-all cursor-pointer group"
                      onClick={() => handleViewDetails(delivery)}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          <div className={`p-1.5 rounded-lg ${getStatusColor(delivery.status)}`}>
                            <StatusIcon className="w-3.5 h-3.5" />
                          </div>
                          <span className={`px-2.5 py-1 text-xs font-semibold rounded-lg ${getStatusColor(delivery.status)}`}>
                            {delivery.status.replace('_', ' ')}
                          </span>
                        </div>
                        <button
                          className="p-2 text-gray-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                          title="View details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="space-y-2 mb-3">
                        <div className="flex items-center space-x-2">
                          <div className="p-1.5 bg-gray-100 rounded-lg">
                            <User className="w-3 h-3 text-gray-600" />
                          </div>
                          <p className="text-sm font-semibold text-gray-900">{delivery.customer.name}</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="p-1.5 bg-gray-100 rounded-lg">
                            <Phone className="w-3 h-3 text-gray-600" />
                          </div>
                          <p className="text-xs text-gray-600">{delivery.customer.phone}</p>
                        </div>
                        <div className="flex items-start space-x-2">
                          <div className="p-1.5 bg-gray-100 rounded-lg mt-0.5">
                            <MapPin className="w-3 h-3 text-gray-600" />
                          </div>
                          <p className="text-xs text-gray-600 line-clamp-2 flex-1">{delivery.deliveryAddress.fullAddress}</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                        <div className="flex items-center space-x-3">
                          <div className="flex items-center space-x-1.5">
                            <Package className="w-3.5 h-3.5 text-gray-400" />
                            <span className="text-xs text-gray-600 font-medium">{delivery.items.length} items</span>
                          </div>
                          {delivery.deliveryType === 'pos_sale' && (
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-semibold rounded-md">
                              POS
                            </span>
                          )}
                          {delivery.deliveryType === 'order' && (
                            <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-semibold rounded-md">
                              Order
                            </span>
                          )}
                        </div>
                        <span className="text-sm font-bold text-gray-900">
                          {formatCurrency(delivery.totalAmount)}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Delivery Details Panel */}
      <DeliveryDetailsPanel
        isOpen={isDetailsPanelOpen}
        onClose={closeDetailsPanel}
        delivery={selectedDelivery}
      />

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #0d9488;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #0f766e;
        }
      `}</style>
    </DashboardLayout>
  );
}
