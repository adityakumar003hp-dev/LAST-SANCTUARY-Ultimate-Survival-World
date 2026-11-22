/** Approved 8-day / 64-event content catalogue. Runtime wiring is separate. */
export type CampaignLocation = 'apartment' | 'town' | 'mall' | 'restaurant' | 'warehouse' | 'mansion' | 'boarding_point' | 'train' | 'arrival_point' | 'military_base' | 'farm' | 'water_facility' | 'hospital' | 'mansion_medical';
export interface CampaignEvent { id:string; day:number; dayTitle:string; event:number; title:string; summary:string; objectives:string[]; location:CampaignLocation; railwayPlayerRole:'passenger'|null; railwayControl:'AI-only'|null; unlocksAfter:string|null; }
export const CAMPAIGN_TITLE='THE LAST LIFELINE';
export const CAMPAIGN_DAY_COUNT=8;
export const CAMPAIGN_EVENTS_PER_DAY=8;
export const CAMPAIGN_EVENT_COUNT=64;
export const LAST_SANCTUARY_CAMPAIGN: CampaignEvent[] = [
  {
    "id": "LS_D1_01",
    "day": 1,
    "dayTitle": "THE LAST NORMAL DAY",
    "event": 1,
    "title": "A New Morning",
    "summary": "Wake in the apartment and begin an ordinary day.",
    "objectives": [
      "Get out of bed",
      "Explore the apartment and surroundings"
    ],
    "location": "apartment",
    "railwayPlayerRole": null,
    "railwayControl": null,
    "unlocksAfter": null
  },
  {
    "id": "LS_D1_02",
    "day": 1,
    "dayTitle": "THE LAST NORMAL DAY",
    "event": 2,
    "title": "Find Your Friends",
    "summary": "Meet the people who will become the first survivor group.",
    "objectives": [
      "Meet the first residents",
      "Talk with each resident"
    ],
    "location": "town",
    "railwayPlayerRole": null,
    "railwayControl": null,
    "unlocksAfter": "LS_D1_01"
  },
  {
    "id": "LS_D1_03",
    "day": 1,
    "dayTitle": "THE LAST NORMAL DAY",
    "event": 3,
    "title": "Explore Together",
    "summary": "Discover the nearby neighbourhood.",
    "objectives": [
      "Explore nearby streets",
      "Visit public buildings"
    ],
    "location": "town",
    "railwayPlayerRole": null,
    "railwayControl": null,
    "unlocksAfter": "LS_D1_02"
  },
  {
    "id": "LS_D1_04",
    "day": 1,
    "dayTitle": "THE LAST NORMAL DAY",
    "event": 4,
    "title": "A Visit to the Mega Mall",
    "summary": "Visit the shopping centre while the city is still accessible.",
    "objectives": [
      "Reach the Mega Mall",
      "Explore the supermarket and food court"
    ],
    "location": "mall",
    "railwayPlayerRole": null,
    "railwayControl": null,
    "unlocksAfter": "LS_D1_03"
  },
  {
    "id": "LS_D1_05",
    "day": 1,
    "dayTitle": "THE LAST NORMAL DAY",
    "event": 5,
    "title": "A Meal Together",
    "summary": "Visit a restaurant and discover its facilities.",
    "objectives": [
      "Explore the dining area",
      "Visit the commercial kitchen"
    ],
    "location": "restaurant",
    "railwayPlayerRole": null,
    "railwayControl": null,
    "unlocksAfter": "LS_D1_04"
  },
  {
    "id": "LS_D1_06",
    "day": 1,
    "dayTitle": "THE LAST NORMAL DAY",
    "event": 6,
    "title": "Return Home",
    "summary": "Return to the apartment and check the latest news.",
    "objectives": [
      "Regroup with residents",
      "Return home"
    ],
    "location": "apartment",
    "railwayPlayerRole": null,
    "railwayControl": null,
    "unlocksAfter": "LS_D1_05"
  },
  {
    "id": "LS_D1_07",
    "day": 1,
    "dayTitle": "THE LAST NORMAL DAY",
    "event": 7,
    "title": "Unusual Reports",
    "summary": "Hear the first reports of a spreading infection.",
    "objectives": [
      "Check emergency broadcasts",
      "Discuss the reports with residents"
    ],
    "location": "apartment",
    "railwayPlayerRole": null,
    "railwayControl": null,
    "unlocksAfter": "LS_D1_06"
  },
  {
    "id": "LS_D1_08",
    "day": 1,
    "dayTitle": "THE LAST NORMAL DAY",
    "event": 8,
    "title": "The Warning",
    "summary": "Receive an emergency message warning the city.",
    "objectives": [
      "Read the emergency message",
      "Prepare for the next day"
    ],
    "location": "apartment",
    "railwayPlayerRole": null,
    "railwayControl": null,
    "unlocksAfter": "LS_D1_07"
  },
  {
    "id": "LS_D2_01",
    "day": 2,
    "dayTitle": "THE OUTBREAK",
    "event": 1,
    "title": "Emergency Broadcast",
    "summary": "The outbreak escalates across the region.",
    "objectives": [
      "Listen to the emergency broadcast",
      "Reach a safe location"
    ],
    "location": "town",
    "railwayPlayerRole": null,
    "railwayControl": null,
    "unlocksAfter": "LS_D1_08"
  },
  {
    "id": "LS_D2_02",
    "day": 2,
    "dayTitle": "THE OUTBREAK",
    "event": 2,
    "title": "A Changing City",
    "summary": "Observe the city as services begin to fail.",
    "objectives": [
      "Survey accessible streets",
      "Return to the planned route"
    ],
    "location": "town",
    "railwayPlayerRole": null,
    "railwayControl": null,
    "unlocksAfter": "LS_D2_01"
  },
  {
    "id": "LS_D2_03",
    "day": 2,
    "dayTitle": "THE OUTBREAK",
    "event": 3,
    "title": "Mega Mall Supplies",
    "summary": "Collect available food from the supermarket.",
    "objectives": [
      "Collect available groceries",
      "Collect fresh vegetables and fruit"
    ],
    "location": "mall",
    "railwayPlayerRole": null,
    "railwayControl": null,
    "unlocksAfter": "LS_D2_02"
  },
  {
    "id": "LS_D2_04",
    "day": 2,
    "dayTitle": "THE OUTBREAK",
    "event": 4,
    "title": "Essential Goods",
    "summary": "Gather household essentials.",
    "objectives": [
      "Collect bottled water and packaged food",
      "Collect useful household supplies"
    ],
    "location": "mall",
    "railwayPlayerRole": null,
    "railwayControl": null,
    "unlocksAfter": "LS_D2_03"
  },
  {
    "id": "LS_D2_05",
    "day": 2,
    "dayTitle": "THE OUTBREAK",
    "event": 5,
    "title": "Distribution Warehouse",
    "summary": "Search the warehouse for stored provisions.",
    "objectives": [
      "Explore accessible storage areas",
      "Collect available supplies"
    ],
    "location": "warehouse",
    "railwayPlayerRole": null,
    "railwayControl": null,
    "unlocksAfter": "LS_D2_04"
  },
  {
    "id": "LS_D2_06",
    "day": 2,
    "dayTitle": "THE OUTBREAK",
    "event": 6,
    "title": "Return to the Mansion",
    "summary": "Bring the collected resources to the protected compound.",
    "objectives": [
      "Return to the mansion",
      "Bring supplies inside"
    ],
    "location": "mansion",
    "railwayPlayerRole": null,
    "railwayControl": null,
    "unlocksAfter": "LS_D2_05"
  },
  {
    "id": "LS_D2_07",
    "day": 2,
    "dayTitle": "THE OUTBREAK",
    "event": 7,
    "title": "Organise the Pantry",
    "summary": "Set up food and household storage.",
    "objectives": [
      "Sort pantry supplies",
      "Store chilled goods in refrigerators"
    ],
    "location": "mansion",
    "railwayPlayerRole": null,
    "railwayControl": null,
    "unlocksAfter": "LS_D2_06"
  },
  {
    "id": "LS_D2_08",
    "day": 2,
    "dayTitle": "THE OUTBREAK",
    "event": 8,
    "title": "First Residents",
    "summary": "Welcome the first survivors into the protected compound.",
    "objectives": [
      "Meet arriving residents",
      "Confirm their accommodation"
    ],
    "location": "mansion",
    "railwayPlayerRole": null,
    "railwayControl": null,
    "unlocksAfter": "LS_D2_07"
  },
  {
    "id": "LS_D3_01",
    "day": 3,
    "dayTitle": "THE RAILWAY JOURNEY",
    "event": 1,
    "title": "A Working Passenger Service",
    "summary": "Learn that an AI-operated passenger train is running.",
    "objectives": [
      "Receive the travel information",
      "Reach the designated boarding location"
    ],
    "location": "boarding_point",
    "railwayPlayerRole": null,
    "railwayControl": null,
    "unlocksAfter": "LS_D2_08"
  },
  {
    "id": "LS_D3_02",
    "day": 3,
    "dayTitle": "THE RAILWAY JOURNEY",
    "event": 2,
    "title": "Board the Train",
    "summary": "Board a stopped passenger train.",
    "objectives": [
      "Wait for the train to stop",
      "Board a passenger carriage"
    ],
    "location": "train",
    "railwayPlayerRole": "passenger",
    "railwayControl": "AI-only",
    "unlocksAfter": "LS_D3_01"
  },
  {
    "id": "LS_D3_03",
    "day": 3,
    "dayTitle": "THE RAILWAY JOURNEY",
    "event": 3,
    "title": "Find Your Seat",
    "summary": "Become familiar with the passenger interior.",
    "objectives": [
      "Explore passenger seating",
      "Find an available seat"
    ],
    "location": "train",
    "railwayPlayerRole": "passenger",
    "railwayControl": "AI-only",
    "unlocksAfter": "LS_D3_02"
  },
  {
    "id": "LS_D3_04",
    "day": 3,
    "dayTitle": "THE RAILWAY JOURNEY",
    "event": 4,
    "title": "The Journey Begins",
    "summary": "Travel as a passenger while AI controls the train.",
    "objectives": [
      "Remain aboard during departure",
      "Observe the journey"
    ],
    "location": "train",
    "railwayPlayerRole": "passenger",
    "railwayControl": "AI-only",
    "unlocksAfter": "LS_D3_03"
  },
  {
    "id": "LS_D3_05",
    "day": 3,
    "dayTitle": "THE RAILWAY JOURNEY",
    "event": 5,
    "title": "Explore the Carriages",
    "summary": "Walk through the connected passenger interiors.",
    "objectives": [
      "Explore connected carriages",
      "Return to the passenger area"
    ],
    "location": "train",
    "railwayPlayerRole": "passenger",
    "railwayControl": "AI-only",
    "unlocksAfter": "LS_D3_04"
  },
  {
    "id": "LS_D3_06",
    "day": 3,
    "dayTitle": "THE RAILWAY JOURNEY",
    "event": 6,
    "title": "Destination Announcement",
    "summary": "Listen to the automatic destination announcement.",
    "objectives": [
      "Hear the upcoming destination",
      "Prepare to disembark"
    ],
    "location": "train",
    "railwayPlayerRole": "passenger",
    "railwayControl": "AI-only",
    "unlocksAfter": "LS_D3_05"
  },
  {
    "id": "LS_D3_07",
    "day": 3,
    "dayTitle": "THE RAILWAY JOURNEY",
    "event": 7,
    "title": "The Countryside",
    "summary": "Watch the train travel through the surrounding landscape.",
    "objectives": [
      "Observe the changing scenery",
      "Remain aboard until arrival"
    ],
    "location": "train",
    "railwayPlayerRole": "passenger",
    "railwayControl": "AI-only",
    "unlocksAfter": "LS_D3_06"
  },
  {
    "id": "LS_D3_08",
    "day": 3,
    "dayTitle": "THE RAILWAY JOURNEY",
    "event": 8,
    "title": "Arrive at the Military Base",
    "summary": "Exit at the designated destination.",
    "objectives": [
      "Wait until the train stops",
      "Disembark at the arrival point"
    ],
    "location": "arrival_point",
    "railwayPlayerRole": null,
    "railwayControl": null,
    "unlocksAfter": "LS_D3_07"
  },
  {
    "id": "LS_D4_01",
    "day": 4,
    "dayTitle": "THE MILITARY CONNECTION",
    "event": 1,
    "title": "Meet the Representatives",
    "summary": "Meet the people coordinating the protected military location.",
    "objectives": [
      "Reach the designated meeting area",
      "Speak with the representatives"
    ],
    "location": "military_base",
    "railwayPlayerRole": null,
    "railwayControl": null,
    "unlocksAfter": "LS_D3_08"
  },
  {
    "id": "LS_D4_02",
    "day": 4,
    "dayTitle": "THE MILITARY CONNECTION",
    "event": 2,
    "title": "Explore the Base",
    "summary": "Explore accessible base buildings.",
    "objectives": [
      "Visit the accommodation area",
      "Visit the medical division and storage"
    ],
    "location": "military_base",
    "railwayPlayerRole": null,
    "railwayControl": null,
    "unlocksAfter": "LS_D4_01"
  },
  {
    "id": "LS_D4_03",
    "day": 4,
    "dayTitle": "THE MILITARY CONNECTION",
    "event": 3,
    "title": "Medical Supplies",
    "summary": "Inspect the medical supply inventory.",
    "objectives": [
      "Visit the medical storage area",
      "Record available supplies"
    ],
    "location": "military_base",
    "railwayPlayerRole": null,
    "railwayControl": null,
    "unlocksAfter": "LS_D4_02"
  },
  {
    "id": "LS_D4_04",
    "day": 4,
    "dayTitle": "THE MILITARY CONNECTION",
    "event": 4,
    "title": "Food and Equipment",
    "summary": "Discover the base stored provisions.",
    "objectives": [
      "Explore food storage",
      "Inspect general equipment storage"
    ],
    "location": "military_base",
    "railwayPlayerRole": null,
    "railwayControl": null,
    "unlocksAfter": "LS_D4_03"
  },
  {
    "id": "LS_D4_05",
    "day": 4,
    "dayTitle": "THE MILITARY CONNECTION",
    "event": 5,
    "title": "Establish Communication",
    "summary": "Connect the mansion with the military base.",
    "objectives": [
      "Activate the communication point",
      "Confirm contact with the mansion"
    ],
    "location": "military_base",
    "railwayPlayerRole": null,
    "railwayControl": null,
    "unlocksAfter": "LS_D4_04"
  },
  {
    "id": "LS_D4_06",
    "day": 4,
    "dayTitle": "THE MILITARY CONNECTION",
    "event": 6,
    "title": "Supply Exchange",
    "summary": "Arrange a first exchange of useful resources.",
    "objectives": [
      "Prepare the supply list",
      "Complete the exchange"
    ],
    "location": "military_base",
    "railwayPlayerRole": null,
    "railwayControl": null,
    "unlocksAfter": "LS_D4_05"
  },
  {
    "id": "LS_D4_07",
    "day": 4,
    "dayTitle": "THE MILITARY CONNECTION",
    "event": 7,
    "title": "Protected Perimeter",
    "summary": "Confirm the base is a protected location.",
    "objectives": [
      "Inspect the perimeter from inside",
      "Verify gates and access points"
    ],
    "location": "military_base",
    "railwayPlayerRole": null,
    "railwayControl": null,
    "unlocksAfter": "LS_D4_06"
  },
  {
    "id": "LS_D4_08",
    "day": 4,
    "dayTitle": "THE MILITARY CONNECTION",
    "event": 8,
    "title": "A Reliable Connection",
    "summary": "Complete the first successful supply transfer.",
    "objectives": [
      "Confirm the transferred supplies",
      "Update the Lifeline Network map"
    ],
    "location": "military_base",
    "railwayPlayerRole": null,
    "railwayControl": null,
    "unlocksAfter": "LS_D4_07"
  },
  {
    "id": "LS_D5_01",
    "day": 5,
    "dayTitle": "FOOD, WATER AND SELF-SUFFICIENCY",
    "event": 1,
    "title": "Discover the Farm",
    "summary": "Locate the agricultural farm.",
    "objectives": [
      "Reach the farm",
      "Explore the cultivated area"
    ],
    "location": "farm",
    "railwayPlayerRole": null,
    "railwayControl": null,
    "unlocksAfter": "LS_D4_08"
  },
  {
    "id": "LS_D5_02",
    "day": 5,
    "dayTitle": "FOOD, WATER AND SELF-SUFFICIENCY",
    "event": 2,
    "title": "Greenhouse Visit",
    "summary": "Explore the greenhouse and growing areas.",
    "objectives": [
      "Visit greenhouse rows",
      "Inspect available crops"
    ],
    "location": "farm",
    "railwayPlayerRole": null,
    "railwayControl": null,
    "unlocksAfter": "LS_D5_01"
  },
  {
    "id": "LS_D5_03",
    "day": 5,
    "dayTitle": "FOOD, WATER AND SELF-SUFFICIENCY",
    "event": 3,
    "title": "Fresh Harvest",
    "summary": "Collect available produce.",
    "objectives": [
      "Collect available vegetables",
      "Collect available fruit"
    ],
    "location": "farm",
    "railwayPlayerRole": null,
    "railwayControl": null,
    "unlocksAfter": "LS_D5_02"
  },
  {
    "id": "LS_D5_04",
    "day": 5,
    "dayTitle": "FOOD, WATER AND SELF-SUFFICIENCY",
    "event": 4,
    "title": "Seed Storage",
    "summary": "Discover seeds and farming supplies.",
    "objectives": [
      "Inspect seed storage",
      "Collect permitted farming supplies"
    ],
    "location": "farm",
    "railwayPlayerRole": null,
    "railwayControl": null,
    "unlocksAfter": "LS_D5_03"
  },
  {
    "id": "LS_D5_05",
    "day": 5,
    "dayTitle": "FOOD, WATER AND SELF-SUFFICIENCY",
    "event": 5,
    "title": "Water Facility",
    "summary": "Visit the water treatment facility.",
    "objectives": [
      "Explore the facility",
      "Inspect the water system status"
    ],
    "location": "water_facility",
    "railwayPlayerRole": null,
    "railwayControl": null,
    "unlocksAfter": "LS_D5_04"
  },
  {
    "id": "LS_D5_06",
    "day": 5,
    "dayTitle": "FOOD, WATER AND SELF-SUFFICIENCY",
    "event": 6,
    "title": "Clean Water Supply",
    "summary": "Restore clean-water availability through the game interaction.",
    "objectives": [
      "Activate the facility supply interaction",
      "Confirm water reaches the sanctuary"
    ],
    "location": "water_facility",
    "railwayPlayerRole": null,
    "railwayControl": null,
    "unlocksAfter": "LS_D5_05"
  },
  {
    "id": "LS_D5_07",
    "day": 5,
    "dayTitle": "FOOD, WATER AND SELF-SUFFICIENCY",
    "event": 7,
    "title": "Kitchen Organisation",
    "summary": "Organise food preparation and storage.",
    "objectives": [
      "Sort kitchen supplies",
      "Check refrigerator and freezer storage"
    ],
    "location": "mansion",
    "railwayPlayerRole": null,
    "railwayControl": null,
    "unlocksAfter": "LS_D5_06"
  },
  {
    "id": "LS_D5_08",
    "day": 5,
    "dayTitle": "FOOD, WATER AND SELF-SUFFICIENCY",
    "event": 8,
    "title": "Sustainable Food",
    "summary": "Establish the first recurring food-production routine.",
    "objectives": [
      "Assign farming tasks",
      "Record the first production cycle"
    ],
    "location": "mansion",
    "railwayPlayerRole": null,
    "railwayControl": null,
    "unlocksAfter": "LS_D5_07"
  },
  {
    "id": "LS_D6_01",
    "day": 6,
    "dayTitle": "THE LIFELINE NETWORK",
    "event": 1,
    "title": "Distribution Hub",
    "summary": "Discover the regional distribution warehouse.",
    "objectives": [
      "Explore the warehouse",
      "Record available stock"
    ],
    "location": "warehouse",
    "railwayPlayerRole": null,
    "railwayControl": null,
    "unlocksAfter": "LS_D5_08"
  },
  {
    "id": "LS_D6_02",
    "day": 6,
    "dayTitle": "THE LIFELINE NETWORK",
    "event": 2,
    "title": "Warehouse Supplies",
    "summary": "Collect useful supplies from accessible storage.",
    "objectives": [
      "Collect available household goods",
      "Store collected goods"
    ],
    "location": "warehouse",
    "railwayPlayerRole": null,
    "railwayControl": null,
    "unlocksAfter": "LS_D6_01"
  },
  {
    "id": "LS_D6_03",
    "day": 6,
    "dayTitle": "THE LIFELINE NETWORK",
    "event": 3,
    "title": "Hospital Connection",
    "summary": "Establish a medical supply connection.",
    "objectives": [
      "Visit the hospital",
      "Record available medical stock"
    ],
    "location": "hospital",
    "railwayPlayerRole": null,
    "railwayControl": null,
    "unlocksAfter": "LS_D6_02"
  },
  {
    "id": "LS_D6_04",
    "day": 6,
    "dayTitle": "THE LIFELINE NETWORK",
    "event": 4,
    "title": "Commercial Kitchen",
    "summary": "Explore the restaurant commercial kitchen.",
    "objectives": [
      "Visit food preparation areas",
      "Inspect cold storage"
    ],
    "location": "restaurant",
    "railwayPlayerRole": null,
    "railwayControl": null,
    "unlocksAfter": "LS_D6_03"
  },
  {
    "id": "LS_D6_05",
    "day": 6,
    "dayTitle": "THE LIFELINE NETWORK",
    "event": 5,
    "title": "Food Distribution",
    "summary": "Organise food distribution between locations.",
    "objectives": [
      "Prepare a food inventory",
      "Confirm a delivery destination"
    ],
    "location": "mansion",
    "railwayPlayerRole": null,
    "railwayControl": null,
    "unlocksAfter": "LS_D6_04"
  },
  {
    "id": "LS_D6_06",
    "day": 6,
    "dayTitle": "THE LIFELINE NETWORK",
    "event": 6,
    "title": "Military Link",
    "summary": "Connect the military base to the regional network.",
    "objectives": [
      "Confirm base communication",
      "Add the base to the network map"
    ],
    "location": "military_base",
    "railwayPlayerRole": null,
    "railwayControl": null,
    "unlocksAfter": "LS_D6_05"
  },
  {
    "id": "LS_D6_07",
    "day": 6,
    "dayTitle": "THE LIFELINE NETWORK",
    "event": 7,
    "title": "Resident Assignments",
    "summary": "Assign residents to community roles.",
    "objectives": [
      "Assign farming and kitchen duties",
      "Assign medical and maintenance duties"
    ],
    "location": "mansion",
    "railwayPlayerRole": null,
    "railwayControl": null,
    "unlocksAfter": "LS_D6_06"
  },
  {
    "id": "LS_D6_08",
    "day": 6,
    "dayTitle": "THE LIFELINE NETWORK",
    "event": 8,
    "title": "Activate the Network",
    "summary": "Activate the central Lifeline Network map.",
    "objectives": [
      "Review connected locations",
      "Activate the network status"
    ],
    "location": "mansion",
    "railwayPlayerRole": null,
    "railwayControl": null,
    "unlocksAfter": "LS_D6_07"
  },
  {
    "id": "LS_D7_01",
    "day": 7,
    "dayTitle": "BUILDING A NEW HOME",
    "event": 1,
    "title": "Mansion Inspection",
    "summary": "Inspect the complete mansion compound.",
    "objectives": [
      "Visit the main rooms",
      "Review compound facilities"
    ],
    "location": "mansion",
    "railwayPlayerRole": null,
    "railwayControl": null,
    "unlocksAfter": "LS_D6_08"
  },
  {
    "id": "LS_D7_02",
    "day": 7,
    "dayTitle": "BUILDING A NEW HOME",
    "event": 2,
    "title": "Perimeter Inspection",
    "summary": "Verify the protected walls and gates.",
    "objectives": [
      "Inspect the inside perimeter",
      "Test authorised gate interaction"
    ],
    "location": "mansion",
    "railwayPlayerRole": null,
    "railwayControl": null,
    "unlocksAfter": "LS_D7_01"
  },
  {
    "id": "LS_D7_03",
    "day": 7,
    "dayTitle": "BUILDING A NEW HOME",
    "event": 3,
    "title": "Pantry and Cold Storage",
    "summary": "Complete the food storage organisation.",
    "objectives": [
      "Organise pantry shelves",
      "Check refrigerator and freezer storage"
    ],
    "location": "mansion",
    "railwayPlayerRole": null,
    "railwayControl": null,
    "unlocksAfter": "LS_D7_02"
  },
  {
    "id": "LS_D7_04",
    "day": 7,
    "dayTitle": "BUILDING A NEW HOME",
    "event": 4,
    "title": "Medical Section",
    "summary": "Complete the first-floor medical section.",
    "objectives": [
      "Prepare reception and examination room",
      "Set up treatment, recovery and medicine storage rooms"
    ],
    "location": "mansion_medical",
    "railwayPlayerRole": null,
    "railwayControl": null,
    "unlocksAfter": "LS_D7_03"
  },
  {
    "id": "LS_D7_05",
    "day": 7,
    "dayTitle": "BUILDING A NEW HOME",
    "event": 5,
    "title": "Workshop and Storage",
    "summary": "Organise the workshop and equipment storage.",
    "objectives": [
      "Arrange workshop stations",
      "Organise storage areas"
    ],
    "location": "mansion",
    "railwayPlayerRole": null,
    "railwayControl": null,
    "unlocksAfter": "LS_D7_04"
  },
  {
    "id": "LS_D7_06",
    "day": 7,
    "dayTitle": "BUILDING A NEW HOME",
    "event": 6,
    "title": "Garden and Greenhouse",
    "summary": "Develop the sanctuary growing area.",
    "objectives": [
      "Prepare garden beds",
      "Organise greenhouse supplies"
    ],
    "location": "mansion",
    "railwayPlayerRole": null,
    "railwayControl": null,
    "unlocksAfter": "LS_D7_05"
  },
  {
    "id": "LS_D7_07",
    "day": 7,
    "dayTitle": "BUILDING A NEW HOME",
    "event": 7,
    "title": "Garage and Recreation",
    "summary": "Complete the garage and outdoor living areas.",
    "objectives": [
      "Organise the garage",
      "Inspect pool and outdoor areas"
    ],
    "location": "mansion",
    "railwayPlayerRole": null,
    "railwayControl": null,
    "unlocksAfter": "LS_D7_06"
  },
  {
    "id": "LS_D7_08",
    "day": 7,
    "dayTitle": "BUILDING A NEW HOME",
    "event": 8,
    "title": "Community Meeting",
    "summary": "Establish permanent sanctuary routines.",
    "objectives": [
      "Gather residents",
      "Confirm community responsibilities"
    ],
    "location": "mansion",
    "railwayPlayerRole": null,
    "railwayControl": null,
    "unlocksAfter": "LS_D7_07"
  },
  {
    "id": "LS_D8_01",
    "day": 8,
    "dayTitle": "THE LAST SANCTUARY",
    "event": 1,
    "title": "Full Sanctuary Review",
    "summary": "Review all sanctuary facilities.",
    "objectives": [
      "Inspect essential rooms",
      "Review the Lifeline Network map"
    ],
    "location": "mansion",
    "railwayPlayerRole": null,
    "railwayControl": null,
    "unlocksAfter": "LS_D7_08"
  },
  {
    "id": "LS_D8_02",
    "day": 8,
    "dayTitle": "THE LAST SANCTUARY",
    "event": 2,
    "title": "Food and Water",
    "summary": "Verify food and water availability.",
    "objectives": [
      "Check pantry stock",
      "Check water supply"
    ],
    "location": "mansion",
    "railwayPlayerRole": null,
    "railwayControl": null,
    "unlocksAfter": "LS_D8_01"
  },
  {
    "id": "LS_D8_03",
    "day": 8,
    "dayTitle": "THE LAST SANCTUARY",
    "event": 3,
    "title": "Medical Readiness",
    "summary": "Confirm the medical section is operational.",
    "objectives": [
      "Check medical inventory",
      "Check patient beds and equipment"
    ],
    "location": "mansion_medical",
    "railwayPlayerRole": null,
    "railwayControl": null,
    "unlocksAfter": "LS_D8_02"
  },
  {
    "id": "LS_D8_04",
    "day": 8,
    "dayTitle": "THE LAST SANCTUARY",
    "event": 4,
    "title": "Power Systems",
    "summary": "Confirm electricity and backup systems.",
    "objectives": [
      "Check solar power status",
      "Check backup power status"
    ],
    "location": "mansion",
    "railwayPlayerRole": null,
    "railwayControl": null,
    "unlocksAfter": "LS_D8_03"
  },
  {
    "id": "LS_D8_05",
    "day": 8,
    "dayTitle": "THE LAST SANCTUARY",
    "event": 5,
    "title": "Farm Operations",
    "summary": "Confirm the farm and greenhouse are operating.",
    "objectives": [
      "Review crop status",
      "Review food production"
    ],
    "location": "farm",
    "railwayPlayerRole": null,
    "railwayControl": null,
    "unlocksAfter": "LS_D8_04"
  },
  {
    "id": "LS_D8_06",
    "day": 8,
    "dayTitle": "THE LAST SANCTUARY",
    "event": 6,
    "title": "Network Connections",
    "summary": "Confirm military and Lifeline connections.",
    "objectives": [
      "Check military connection",
      "Check connected supply locations"
    ],
    "location": "mansion",
    "railwayPlayerRole": null,
    "railwayControl": null,
    "unlocksAfter": "LS_D8_05"
  },
  {
    "id": "LS_D8_07",
    "day": 8,
    "dayTitle": "THE LAST SANCTUARY",
    "event": 7,
    "title": "Final Community Meeting",
    "summary": "Gather residents for the final campaign meeting.",
    "objectives": [
      "Gather residents",
      "Review community progress"
    ],
    "location": "mansion",
    "railwayPlayerRole": null,
    "railwayControl": null,
    "unlocksAfter": "LS_D8_06"
  },
  {
    "id": "LS_D8_08",
    "day": 8,
    "dayTitle": "THE LAST SANCTUARY",
    "event": 8,
    "title": "The Last Sanctuary",
    "summary": "Activate the permanent sanctuary chapter.",
    "objectives": [
      "Complete the final checklist",
      "Unlock permanent free roam"
    ],
    "location": "mansion",
    "railwayPlayerRole": null,
    "railwayControl": null,
    "unlocksAfter": "LS_D8_07"
  }
];
export const CAMPAIGN_BY_DAY = Array.from({length:CAMPAIGN_DAY_COUNT},(_,index)=>({day:index+1,events:LAST_SANCTUARY_CAMPAIGN.filter(event=>event.day===index+1)}));
