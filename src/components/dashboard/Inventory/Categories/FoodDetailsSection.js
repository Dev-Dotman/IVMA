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

export default function FoodDetailsSection({
  foodDetails,
  handleCategoryDetailChange,
  selectedStateForCity,
  setSelectedStateForCity,
  addDeliveryState,
  removeDeliveryState,
  toggleCoverAllCitiesInState,
  addCityToDeliveryState,
  removeCityFromDeliveryState
}) {
  if (!foodDetails) return null;

  return (
    <div>
      <h3 className="text-lg font-medium text-gray-900 mb-4">
        Food Details
      </h3>

      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
        <p className="text-sm text-blue-800">
          <strong>💡 Tip:</strong> If you also provide chef services or accept custom orders, 
          you can create a service in the <strong>Services</strong> tab!
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Food Type</label>
          <CustomDropdown
            options={[
              { value: '', label: 'Select type' },
              { value: 'Ready-to-Eat Meals', label: 'Ready-to-Eat Meals' },
              { value: 'Meal Prep/Packaged Food', label: 'Meal Prep/Packaged Food' },
              { value: 'Baked Goods', label: 'Baked Goods' },
              { value: 'Snacks & Small Chops', label: 'Snacks & Small Chops' },
              { value: 'Traditional Nigerian Dishes', label: 'Traditional Nigerian Dishes' },
              { value: 'Continental Dishes', label: 'Continental Dishes' },
              { value: 'Fast Food', label: 'Fast Food' },
              { value: 'Healthy/Organic Meals', label: 'Healthy/Organic Meals' },
              { value: 'Frozen Foods', label: 'Frozen Foods' },
              { value: 'Other', label: 'Other' }
            ]}
            value={foodDetails.foodType}
            onChange={(value) => handleCategoryDetailChange('food', 'foodType', value)}
            placeholder="Select food type"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Serving Size</label>
          <input
            type="text"
            value={foodDetails.servingSize}
            onChange={(e) => handleCategoryDetailChange('food', 'servingSize', e.target.value)}
            placeholder="e.g., 1 person, 2-3 people, Family pack"
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent text-black"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Max Orders Per Day</label>
          <input
            type="number"
            value={foodDetails.maxOrdersPerDay}
            onChange={(e) => handleCategoryDetailChange('food', 'maxOrdersPerDay', e.target.value)}
            placeholder="e.g., 50"
            min="1"
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent text-black"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Spice Level</label>
          <CustomDropdown
            options={[
              { value: '', label: 'Select spice level' },
              { value: 'Not Spicy', label: 'Not Spicy' },
              { value: 'Mild', label: 'Mild' },
              { value: 'Medium', label: 'Medium' },
              { value: 'Hot', label: 'Hot' },
              { value: 'Extra Hot', label: 'Extra Hot' }
            ]}
            value={foodDetails.spiceLevel}
            onChange={(value) => handleCategoryDetailChange('food', 'spiceLevel', value)}
            placeholder="Select spice level"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Allergens (select all that apply)
          </label>
          <div className="flex flex-wrap gap-2">
            {['None', 'Nuts', 'Dairy', 'Eggs', 'Gluten', 'Soy', 'Shellfish', 'Fish'].map(allergen => (
              <button
                key={allergen}
                type="button"
                onClick={() => {
                  const allergens = foodDetails.allergens || [];
                  if (allergens.includes(allergen)) {
                    handleCategoryDetailChange('food', 'allergens', allergens.filter(a => a !== allergen));
                  } else {
                    handleCategoryDetailChange('food', 'allergens', [...allergens, allergen]);
                  }
                }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  (foodDetails.allergens || []).includes(allergen)
                    ? 'bg-teal-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {allergen}
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
              value={foodDetails.deliveryTime.unit}
              onChange={(value) => handleCategoryDetailChange('food', 'deliveryTime', { 
                ...foodDetails.deliveryTime, 
                unit: value 
              })}
              placeholder="Select unit"
            />
            <input
              type="number"
              value={foodDetails.deliveryTime.value}
              onChange={(e) => handleCategoryDetailChange('food', 'deliveryTime', { 
                ...foodDetails.deliveryTime, 
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
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Delivery Locations
          </label>
          
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
                onClick={() => addDeliveryState('food')}
                disabled={!selectedStateForCity}
                className="px-4 py-2.5 bg-teal-600 text-white rounded-xl hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
              >
                Add State
              </button>
            </div>
          </div>

          {foodDetails.deliveryLocations.states.length > 0 && (
            <div className="space-y-3">
              {foodDetails.deliveryLocations.states.map((state) => (
                <div key={state.stateName} className="p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-gray-900">{state.stateName}</h4>
                    <button
                      type="button"
                      onClick={() => removeDeliveryState('food', state.stateName)}
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
                        onChange={() => toggleCoverAllCitiesInState('food', state.stateName)}
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
                                  addCityToDeliveryState('food', state.stateName, city);
                                } else {
                                  removeCityFromDeliveryState('food', state.stateName, city);
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
            {foodDetails.orderingHours.map((day, index) => (
              <div key={day.day} className="p-4 bg-gray-50 rounded-xl">
                <div className="flex items-center justify-between mb-3">
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={day.isAvailable}
                      onChange={(e) => {
                        const newHours = [...foodDetails.orderingHours];
                        newHours[index].isAvailable = e.target.checked;
                        handleCategoryDetailChange('food', 'orderingHours', newHours);
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
                          const newHours = [...foodDetails.orderingHours];
                          newHours[index].startTime = e.target.value;
                          handleCategoryDetailChange('food', 'orderingHours', newHours);
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
                          const newHours = [...foodDetails.orderingHours];
                          newHours[index].endTime = e.target.value;
                          handleCategoryDetailChange('food', 'orderingHours', newHours);
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
