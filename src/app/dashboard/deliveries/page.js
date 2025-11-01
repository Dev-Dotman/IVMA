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
                <p className="text-sm text-gray-600 mb-1">Pending</p>
                <p className="text-2xl font-bold text-gray-900">{stats.scheduledDeliveries}</p>
              </div>
              <div className="p-3 bg-orange-100 rounded-xl">
                <Clock className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Completed</p>
                <p className="text-2xl font-bold text-gray-900">{stats.completedDeliveries}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-xl">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Overdue</p>
                <p className="text-2xl font-bold text-gray-900">{stats.overdueDeliveries}</p>
              </div>
              <div className="p-3 bg-red-100 rounded-xl">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Calendar Section */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl p-6 border border-gray-100">
            {/* Calendar Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                </h3>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => navigateMonth(-1)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4 text-gray-600" />
                  </button>
                  <button
                    onClick={() => navigateMonth(1)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <ChevronRight className="w-4 h-4 text-gray-600" />
                  </button>
                </div>
              </div>
              <button
                onClick={() => setCurrentDate(new Date())}
                className="px-4 py-2 text-sm bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
              >
                Today
              </button>
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1 mb-4">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="p-3 text-center text-sm font-medium text-gray-500">
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((day, index) => {
                if (!day) {
                  return <div key={index} className="p-3"></div>;
                }

                const cellDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
                const deliveriesCount = getDeliveriesCountForDate(cellDate);
                const isSelected = isSameDay(cellDate, selectedDate);
                const isTodayDate = isToday(cellDate);

                return (
                  <button
                    key={index}
                    onClick={() => handleDateSelect(day)}
                    className={`p-3 text-sm rounded-lg transition-colors relative ${
                      isSelected
                        ? 'bg-teal-600 text-white'
                        : isTodayDate
                        ? 'bg-teal-100 text-teal-800 font-medium'
                        : 'hover:bg-gray-100 text-gray-900'
                    }`}
                  >
                    {day}
                    {deliveriesCount > 0 && (
                      <div className={`absolute -top-1 -right-1 w-5 h-5 text-xs rounded-full flex items-center justify-center ${
                        isSelected ? 'bg-white text-teal-600' : 'bg-teal-600 text-white'
                      }`}>
                        {deliveriesCount}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Selected Date Deliveries */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {selectedDate.toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric'
                })}
              </h3>
              <span className="px-3 py-1 bg-teal-100 text-teal-800 text-sm rounded-full">
                {deliveries.length} deliveries
              </span>
            </div>

            <div className="space-y-4 max-h-96 overflow-y-auto">
              {deliveries.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">No deliveries scheduled</p>
                  <p className="text-gray-400 text-xs">Select a date with deliveries to view details</p>
                </div>
              ) : (
                deliveries.map((delivery) => {
                  const StatusIcon = getStatusIcon(delivery.status);
                  return (
                    <div key={delivery._id} className="border border-gray-200 rounded-xl p-4 hover:border-teal-300 transition-colors">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          <StatusIcon className="w-4 h-4 text-gray-500" />
                          <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(delivery.status)}`}>
                            {delivery.status}
                          </span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <span className="text-xs text-gray-500">
                            {delivery.timeSlot !== 'anytime' && delivery.timeSlot}
                          </span>
                          <button
                            onClick={() => handleViewDetails(delivery)}
                            className="p-1 text-gray-400 hover:text-teal-600 hover:bg-teal-50 rounded transition-colors"
                            title="View details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="mb-3">
                        <div className="flex items-center space-x-2 mb-1">
                          <User className="w-3 h-3 text-gray-400" />
                          <p className="text-sm font-medium text-gray-900">{delivery.customer.name}</p>
                        </div>
                        <div className="flex items-center space-x-2 mb-1">
                          <Phone className="w-3 h-3 text-gray-400" />
                          <p className="text-xs text-gray-600">{delivery.customer.phone}</p>
                        </div>
                        <div className="flex items-start space-x-2">
                          <MapPin className="w-3 h-3 text-gray-400 mt-0.5" />
                          <p className="text-xs text-gray-600 line-clamp-2">{delivery.deliveryAddress.fullAddress}</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center space-x-2">
                          <Package className="w-3 h-3 text-gray-400" />
                          <span className="text-gray-600">{delivery.items.length} items</span>
                        </div>
                        <span className="font-medium text-gray-900">
                          {formatCurrency(delivery.totalAmount)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between mt-3">
                        {delivery.deliveryType === 'pos_sale' && (
                          <div className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded">
                            POS Sale
                          </div>
                        )}
                        {delivery.deliveryType === 'order' && (
                          <div className="px-2 py-1 bg-green-50 text-green-700 text-xs rounded">
                            Order
                          </div>
                        )}
                        
                        <button
                          onClick={() => handleViewDetails(delivery)}
                          className="text-xs text-teal-600 hover:text-teal-700 font-medium"
                        >
                          View Details →
                        </button>
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
    </DashboardLayout>
  );
}
