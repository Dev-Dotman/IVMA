"use client";
import CustomDropdown from "@/components/ui/CustomDropdown";

const NIGERIAN_STATES = {
  'Lagos': ['Ikeja', 'Lagos Island', 'Lekki', 'Ikorodu', 'Epe', 'Badagry', 'Victoria Island', 'Yaba', 'Surulere', 'Ajah'],
  'Abuja': ['Central Area', 'Garki', 'Wuse', 'Maitama', 'Asokoro', 'Gwarinpa', 'Kubwa', 'Lugbe'],
  'Oyo': ['Ibadan', 'Ogbomoso', 'Oyo', 'Iseyin'],
  'Ogun': ['Abeokuta', 'Ijebu-Ode', 'Sagamu', 'Ota'],
  'Rivers': ['Port Harcourt', 'Obio-Akpor', 'Bonny', 'Eleme'],
  'Kano': ['Kano', 'Wudil', 'Bichi', 'Gwarzo']
};

export default function BeveragesDetailsSection({
  beveragesDetails,
  handleCategoryDetailChange,
  selectedStateForCity,
  setSelectedStateForCity,
  addDeliveryState,
  removeDeliveryState,
  toggleCoverAllCitiesInState,
  addCityToDeliveryState,
  removeCityFromDeliveryState
}) {
  if (!beveragesDetails) return null;

  return (
    <div>
      <h3 className="text-lg font-medium text-gray-900 mb-4">
        Beverage Details
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Beverage Type</label>
          <CustomDropdown
            options={[
              { value: '', label: 'Select type' },
              { value: 'Soft Drinks', label: 'Soft Drinks' },
              { value: 'Juices', label: 'Juices' },
              { value: 'Energy Drinks', label: 'Energy Drinks' },
              { value: 'Water', label: 'Water' },
              { value: 'Tea/Coffee', label: 'Tea/Coffee' },
              { value: 'Smoothies', label: 'Smoothies' },
              { value: 'Alcoholic Beverages', label: 'Alcoholic Beverages' },
              { value: 'Traditional Drinks', label: 'Traditional Drinks' },
              { value: 'Other', label: 'Other' }
            ]}
            value={beveragesDetails.beverageType}
            onChange={(value) => handleCategoryDetailChange('beverages', 'beverageType', value)}
            placeholder="Select beverage type"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Volume/Size</label>
          <input
            type="text"
            value={beveragesDetails.volume}
            onChange={(e) => handleCategoryDetailChange('beverages', 'volume', e.target.value)}
            placeholder="e.g., 50cl, 1L, 2L"
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent text-black"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Packaging</label>
          <CustomDropdown
            options={[
              { value: '', label: 'Select packaging' },
              { value: 'Bottle', label: 'Bottle' },
              { value: 'Can', label: 'Can' },
              { value: 'Sachet', label: 'Sachet' },
              { value: 'Carton', label: 'Carton' },
              { value: 'Cup', label: 'Cup' },
              { value: 'Keg', label: 'Keg' },
              { value: 'Other', label: 'Other' }
            ]}
            value={beveragesDetails.packaging}
            onChange={(value) => handleCategoryDetailChange('beverages', 'packaging', value)}
            placeholder="Select packaging"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Alcoholic Content (if applicable)</label>
          <input
            type="text"
            value={beveragesDetails.alcoholContent}
            onChange={(e) => handleCategoryDetailChange('beverages', 'alcoholContent', e.target.value)}
            placeholder="e.g., 5%, 12%"
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent text-black"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Flavor Profile (select all that apply)
          </label>
          <div className="flex flex-wrap gap-2">
            {['Sweet', 'Sour', 'Bitter', 'Fruity', 'Citrus', 'Herbal', 'Spicy', 'Other'].map(flavor => (
              <button
                key={flavor}
                type="button"
                onClick={() => {
                  const flavors = beveragesDetails.flavorProfile || [];
                  if (flavors.includes(flavor)) {
                    handleCategoryDetailChange('beverages', 'flavorProfile', flavors.filter(f => f !== flavor));
                  } else {
                    handleCategoryDetailChange('beverages', 'flavorProfile', [...flavors, flavor]);
                  }
                }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  (beveragesDetails.flavorProfile || []).includes(flavor)
                    ? 'bg-teal-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {flavor}
              </button>
            ))}
          </div>
        </div>

        {/* Delivery Time */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">Delivery Time</label>
          <div className="grid grid-cols-2 gap-3">
            <CustomDropdown
              options={[
                { value: 'minutes', label: 'Minutes' },
                { value: 'hours', label: 'Hours' },
                { value: 'days', label: 'Days' }
              ]}
              value={beveragesDetails.deliveryTime.unit}
              onChange={(value) => handleCategoryDetailChange('beverages', 'deliveryTime', { 
                ...beveragesDetails.deliveryTime, 
                unit: value 
              })}
              placeholder="Select unit"
            />
            <input
              type="number"
              value={beveragesDetails.deliveryTime.value}
              onChange={(e) => handleCategoryDetailChange('beverages', 'deliveryTime', { 
                ...beveragesDetails.deliveryTime, 
                value: parseInt(e.target.value) || 0 
              })}
              placeholder="e.g., 30"
              min="1"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent text-black"
            />
          </div>
        </div>

        {/* Delivery Locations */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">Delivery Locations</label>
          
          <div className="mb-4">
            <div className="flex gap-2">
              <div className="flex-1">
                <CustomDropdown
                  options={[
                    { value: '', label: 'Select a state' },
                    ...Object.keys(NIGERIAN_STATES).map(state => ({
                      value: state,
                      label: state
                    }))
                  ]}
                  value={selectedStateForCity}
                  onChange={setSelectedStateForCity}
                  placeholder="Select state"
                />
              </div>
              <button
                type="button"
                onClick={() => addDeliveryState('beverages')}
                disabled={!selectedStateForCity}
                className="px-4 py-2.5 bg-teal-600 text-white rounded-xl hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
              >
                Add State
              </button>
            </div>
          </div>

          {beveragesDetails.deliveryLocations.states.length > 0 && (
            <div className="space-y-3">
              {beveragesDetails.deliveryLocations.states.map((state) => (
                <div key={state.stateName} className="p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-gray-900">{state.stateName}</h4>
                    <button
                      type="button"
                      onClick={() => removeDeliveryState('beverages', state.stateName)}
                      className="text-red-500 hover:text-red-600 text-sm font-medium"
                    >
                      Remove
                    </button>
                  </div>

                  <div className="mb-3">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={state.coverAllCities}
                        onChange={() => toggleCoverAllCitiesInState('beverages', state.stateName)}
                        className="w-4 h-4 text-teal-600 rounded focus:ring-teal-500"
                      />
                      <span className="text-sm text-gray-700">All cities in {state.stateName}</span>
                    </label>
                  </div>

                  {!state.coverAllCities && (
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-2">Select Cities</label>
                      <div className="grid grid-cols-3 gap-2 max-h-32 overflow-y-auto">
                        {NIGERIAN_STATES[state.stateName]?.map((city) => (
                          <label
                            key={city}
                            className="flex items-center space-x-2 cursor-pointer text-sm"
                          >
                            <input
                              type="checkbox"
                              checked={state.cities.includes(city)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  addCityToDeliveryState('beverages', state.stateName, city);
                                } else {
                                  removeCityFromDeliveryState('beverages', state.stateName, city);
                                }
                              }}
                              className="w-3 h-3 text-teal-600 rounded focus:ring-teal-500"
                            />
                            <span className="text-gray-700">{city}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Ordering Hours */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-3">Ordering Hours</label>
          <div className="space-y-3">
            {beveragesDetails.orderingHours.map((day, index) => (
              <div key={day.day} className="p-4 bg-gray-50 rounded-xl">
                <div className="flex items-center justify-between mb-3">
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={day.isAvailable}
                      onChange={(e) => {
                        const newHours = [...beveragesDetails.orderingHours];
                        newHours[index].isAvailable = e.target.checked;
                        handleCategoryDetailChange('beverages', 'orderingHours', newHours);
                      }}
                      className="w-4 h-4 text-teal-600 rounded focus:ring-teal-500"
                    />
                    <span className="font-medium text-gray-900 capitalize">{day.day}</span>
                  </label>
                </div>

                {day.isAvailable && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Start Time</label>
                      <input
                        type="time"
                        value={day.startTime}
                        onChange={(e) => {
                          const newHours = [...beveragesDetails.orderingHours];
                          newHours[index].startTime = e.target.value;
                          handleCategoryDetailChange('beverages', 'orderingHours', newHours);
                        }}
                        className="w-full px-3 py-2 bg-white border-0 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-gray-900 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">End Time</label>
                      <input
                        type="time"
                        value={day.endTime}
                        onChange={(e) => {
                          const newHours = [...beveragesDetails.orderingHours];
                          newHours[index].endTime = e.target.value;
                          handleCategoryDetailChange('beverages', 'orderingHours', newHours);
                        }}
                        className="w-full px-3 py-2 bg-white border-0 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-gray-900 text-sm"
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
