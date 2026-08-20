import { TripItinerary } from '../types';

export const FEATURED_TRIPS: { id: string; title: string; subtitle: string; image: string; color: string; itinerary: TripItinerary }[] = [
    {
        id: 'feat_tokyo_cyber',
        title: "NEON DRIFT",
        subtitle: "TOKYO, JAPAN",
        image: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&q=80",
        color: "cyan",
        itinerary: {
            destination: "Tokyo, Japan",
            duration: "7 Days",
            totalEstimatedCost: "₹2,45,000",
            summary: "A high-octane journey through the electric streets of Tokyo, blending cyberpunk aesthetics with ancient tradition.",
            coordinates: { lat: 35.6762, lon: 139.6503 },
            travelOptions: [
                { type: "FLIGHT", provider: "Air India", departureTime: "22:00", arrivalTime: "09:00", duration: "8h 30m", price: "₹65,000", departureLocation: "DEL", arrivalLocation: "HND", bookingLink: "https://www.airindia.in" },
                { type: "FLIGHT", provider: "JAL", departureTime: "18:00", arrivalTime: "06:00", duration: "9h", price: "₹72,000", departureLocation: "BOM", arrivalLocation: "NRT", bookingLink: "https://www.jal.co.jp" },
                { type: "FLIGHT", provider: "Singapore Airlines", departureTime: "14:00", arrivalTime: "08:00", duration: "12h", price: "₹58,000", departureLocation: "BLR", arrivalLocation: "HND", bookingLink: "https://www.singaporeair.com" }
            ],
            accommodation: [
                { name: "Park Hyatt Tokyo", type: "Luxury", rating: "5.0", pricePerNight: "₹45,000", location: "Shinjuku", description: "City views.", amenities: ["Pool", "Spa"], imageUrl: "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&q=80", checkInTime: "15:00" },
                { name: "Aman Tokyo", type: "Ultra-Luxury", rating: "5.0", pricePerNight: "₹85,000", location: "Otemachi", description: "Urban sanctuary.", amenities: ["Lounge", "Library"], imageUrl: "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=80", checkInTime: "15:00" },
                { name: "Hoshinoya Tokyo", type: "Ryokan", rating: "4.9", pricePerNight: "₹60,000", location: "Chiyoda", description: "Modern Ryokan.", amenities: ["Onsen", "Tea Ceremony"], imageUrl: "https://images.unsplash.com/photo-1493996687846-48a38c8d2452?auto=format&fit=crop&q=80", checkInTime: "15:00" },
                { name: "The Peninsula Tokyo", type: "Grand Luxury", rating: "4.8", pricePerNight: "₹55,000", location: "Ginza", description: "Imperial gardens views.", amenities: ["Rolls-Royce service", "Spa"], imageUrl: "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&q=80", checkInTime: "15:00" }
            ],
            days: [
                {
                    day: "Day 1", theme: "Neon Canyons", activities: [
                        { time: "18:00", title: "Shinjuku Night Walk", description: "Kabukicho neon explorer.", location: "Shinjuku", estimatedCost: "₹0", bookingRequired: false, coordinates: { lat: 35.6938, lng: 139.7034 } },
                        { time: "20:00", title: "Robot Restaurant Show", description: "Sci-fi dinner show.", location: "Kabukicho", estimatedCost: "₹8,000", bookingRequired: true, coordinates: { lat: 35.6943, lng: 139.7028 }, transitFromPrev: { mode: "WALK", duration: "5 mins", cost: "₹0", instruction: "Walk south from the station." } }
                    ]
                }
            ],
            dna: { Adventure: 40, Luxury: 30, Culture: 20, Relaxation: 10 }
        }
    },
    {
        id: 'feat_iceland_void',
        title: "THE VOID",
        subtitle: "ICELAND",
        image: "https://images.unsplash.com/photo-1476610182048-b716b8518aae?auto=format&fit=crop&q=80",
        color: "emerald",
        itinerary: {
            destination: "Reykjavik, Iceland",
            duration: "5 Days",
            totalEstimatedCost: "₹3,10,000",
            summary: "Glaciers, volcanoes, and the silence of the north. A tactical retreat into absolute nature.",
            coordinates: { lat: 64.1265, lon: -21.8174 },
            travelOptions: [
                { type: "FLIGHT", provider: "Finnair", departureTime: "08:00", arrivalTime: "16:00", duration: "11h", price: "₹85,000", departureLocation: "DEL", arrivalLocation: "KEF", bookingLink: "#" },
                { type: "FLIGHT", provider: "Lufthansa", departureTime: "02:00", arrivalTime: "14:00", duration: "15h", price: "₹92,000", departureLocation: "BOM", arrivalLocation: "KEF", bookingLink: "#" },
                { type: "FLIGHT", provider: "Icelandair", departureTime: "10:00", arrivalTime: "20:00", duration: "13h", price: "₹78,000", departureLocation: "LHR", arrivalLocation: "KEF", bookingLink: "#" }
            ],
            accommodation: [
                { name: "The Retreat at Blue Lagoon", type: "Luxury", rating: "5.0", pricePerNight: "₹1,20,000", location: "Grindavik", description: "Suites in volcanic earth.", amenities: ["Lagoon", "Spa"], imageUrl: "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&q=80", checkInTime: "15:00" },
                { name: "Ion Adventure Hotel", type: "Design", rating: "4.7", pricePerNight: "₹40,000", location: "Selfoss", description: "Lava flow viewing.", amenities: ["Bar", "Pool"], imageUrl: "https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&q=80", checkInTime: "15:00" },
                { name: "Hotel Rangá", type: "Boutique", rating: "4.6", pricePerNight: "₹35,000", location: "Hella", description: "Star gazing resort.", amenities: ["Observatory", "Hot Tub"], imageUrl: "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&q=80", checkInTime: "15:00" },
                { name: "Deplar Farm", type: "Exclusive", rating: "5.0", pricePerNight: "₹2,50,000", location: "Troll Peninsula", description: "Ultimate seclusion.", amenities: ["Heli-skiing", "Sauna"], imageUrl: "https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&q=80", checkInTime: "15:00" }
            ],
            days: [
                {
                    day: "Day 1", theme: "Ice & Fire", activities: [
                        { time: "14:00", title: "Blue Lagoon Access", description: "Geothermal silica waters.", location: "Grindavik", estimatedCost: "₹12,000", bookingRequired: true, coordinates: { lat: 63.8804, lng: -22.4495 } },
                        { time: "20:00", title: "Moss Restaurant", description: "Volcanic views dining.", location: "Grindavik", estimatedCost: "₹15,000", bookingRequired: true, coordinates: { lat: 63.8804, lng: -22.4495 }, transitFromPrev: { mode: "WALK", duration: "2 mins", cost: "₹0", instruction: "Walk to the upper deck." } }
                    ]
                }
            ],
            dna: { Adventure: 50, Luxury: 20, Culture: 10, Relaxation: 20 }
        }
    },
    {
        id: 'feat_cairo_sands',
        title: "ETERNAL SANDS",
        subtitle: "CAIRO, EGYPT",
        image: "https://images.unsplash.com/photo-1503177119275-0aa32b3a9368?auto=format&fit=crop&q=80",
        color: "orange",
        itinerary: {
            destination: "Cairo, Egypt",
            duration: "6 Days",
            totalEstimatedCost: "₹1,80,000",
            summary: "Walk among gods. A historical deep-dive into the cradle of civilization.",
            coordinates: { lat: 30.0444, lon: 31.2357 },
            travelOptions: [
                { type: "FLIGHT", provider: "Emirates", departureTime: "10:00", arrivalTime: "18:00", duration: "9h", price: "₹55,000", departureLocation: "BOM", arrivalLocation: "CAI", bookingLink: "#" },
                { type: "FLIGHT", provider: "Etihad", departureTime: "04:00", arrivalTime: "12:00", duration: "10h", price: "₹52,000", departureLocation: "DEL", arrivalLocation: "CAI", bookingLink: "#" },
                { type: "FLIGHT", provider: "Qatar", departureTime: "08:00", arrivalTime: "16:00", duration: "11h", price: "₹58,000", departureLocation: "BLR", arrivalLocation: "CAI", bookingLink: "#" }
            ],
            accommodation: [
                { name: "Marriott Mena House", type: "Historic", rating: "4.9", pricePerNight: "₹30,000", location: "Giza", description: "Pyramid views.", amenities: ["Gardens", "Golf"], imageUrl: "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=80", checkInTime: "14:00" },
                { name: "Four Seasons Nile Plaza", type: "Luxury", rating: "5.0", pricePerNight: "₹45,000", location: "Garden City", description: "River views.", amenities: ["Spa", "Pool"], imageUrl: "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&q=80", checkInTime: "15:00" },
                { name: "Steigenberger El Tahrir", type: "Modern", rating: "4.5", pricePerNight: "₹15,000", location: "Tahrir Square", description: "Central location.", amenities: ["Gym", "Pool"], imageUrl: "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=80", checkInTime: "14:00" },
                { name: "The St. Regis Cairo", type: "Grand Luxury", rating: "5.0", pricePerNight: "₹50,000", location: "Nile Corniche", description: "Opulent sanctuary.", amenities: ["Butler", "Pool"], imageUrl: "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&q=80", checkInTime: "15:00" }
            ],
            days: [
                {
                    day: "Day 1", theme: "The Pyramids", activities: [
                        { time: "08:00", title: "Giza Plateau Private Tour", description: "Sphinx with Egyptologist.", location: "Giza", estimatedCost: "₹8,000", bookingRequired: true, coordinates: { lat: 29.9792, lng: 31.1342 } },
                        { time: "13:00", title: "Khufu's Boat Museum", description: "Ancient solar barge.", location: "Giza", estimatedCost: "₹2,000", bookingRequired: false, coordinates: { lat: 29.9792, lng: 31.1342 }, transitFromPrev: { mode: "WALK", duration: "10 mins", cost: "₹0", instruction: "Walk east from the Great Pyramid." } }
                    ]
                }
            ],
            dna: { Adventure: 20, Luxury: 30, Culture: 40, Relaxation: 10 }
        }
    },
    {
        id: 'feat_amalfi_blue',
        title: "AZURE CLIFFS",
        subtitle: "AMALFI, ITALY",
        image: "https://images.unsplash.com/photo-1533903345306-15d1c30952de?auto=format&fit=crop&q=80",
        color: "cyan",
        itinerary: {
            destination: "Amalfi Coast, Italy",
            duration: "6 Days",
            totalEstimatedCost: "₹2,90,000",
            summary: "La Dolce Vita. Terraced vineyards and the Tyrrhenian Sea.",
            coordinates: { lat: 40.6333, lon: 14.6029 },
            travelOptions: [
                { type: "FLIGHT", provider: "ITA Airways", departureTime: "10:00", arrivalTime: "19:00", duration: "12h", price: "₹75,000", departureLocation: "DEL", arrivalLocation: "NAP", bookingLink: "#" },
                { type: "FLIGHT", provider: "Emirates", departureTime: "04:00", arrivalTime: "16:00", duration: "15h", price: "₹82,000", departureLocation: "BOM", arrivalLocation: "NAP", bookingLink: "#" },
                { type: "FLIGHT", provider: "Turkish Airlines", departureTime: "06:00", arrivalTime: "18:00", duration: "16h", price: "₹68,000", departureLocation: "DEL", arrivalLocation: "NAP", bookingLink: "#" }
            ],
            accommodation: [
                { name: "Le Sirenuse", type: "Luxury", rating: "5.0", pricePerNight: "₹95,000", location: "Positano", description: "Legendary red hotel.", amenities: ["Pool", "Terrace"], imageUrl: "https://images.unsplash.com/photo-1533903345306-15d1c30952de?auto=format&fit=crop&q=80", checkInTime: "15:00" },
                { name: "Belmond Hotel Caruso", type: "Palatial", rating: "5.0", pricePerNight: "₹1,10,000", location: "Ravello", description: "11th-century palace.", amenities: ["Infinity Pool", "Gardens"], imageUrl: "https://images.unsplash.com/photo-1533903345306-15d1c30952de?auto=format&fit=crop&q=80", checkInTime: "15:00" },
                { name: "Hotel Santa Caterina", type: "Classic", rating: "4.9", pricePerNight: "₹80,000", location: "Amalfi", description: "Liberty-style villa.", amenities: ["Beach Club", "Elevator to Sea"], imageUrl: "https://images.unsplash.com/photo-1533903345306-15d1c30952de?auto=format&fit=crop&q=80", checkInTime: "15:00" },
                { name: "Monastero Santa Rosa", type: "Boutique", rating: "5.0", pricePerNight: "₹1,20,000", location: "Conca dei Marini", description: "Converted monastery.", amenities: ["Spa", "Infinity Pool"], imageUrl: "https://images.unsplash.com/photo-1533903345306-15d1c30952de?auto=format&fit=crop&q=80", checkInTime: "15:00" }
            ],
            days: [
                {
                    day: "Day 1", theme: "Positano Sunsets", activities: [
                        { time: "16:00", title: "Beach Club Relax", description: "Private cove access.", location: "Positano", estimatedCost: "₹5,000", bookingRequired: true, coordinates: { lat: 40.6281, lng: 14.4850 } },
                        { time: "20:00", title: "Dinner at Franco's", description: "Champagne bar views.", location: "Positano", estimatedCost: "₹10,000", bookingRequired: true, coordinates: { lat: 40.6281, lng: 14.4850 }, transitFromPrev: { mode: "TAXI", duration: "10 mins", cost: "₹2,000", instruction: "Drive up to the cliffside bar." } }
                    ]
                }
            ],
            dna: { Adventure: 10, Luxury: 50, Culture: 20, Relaxation: 20 }
        }
    },
    {
        id: 'feat_patagonia_peak',
        title: "END EDGE",
        subtitle: "PATAGONIA, CHILE",
        image: "https://images.unsplash.com/photo-1517059224940-d4af9eec41b7?auto=format&fit=crop&q=80",
        color: "emerald",
        itinerary: {
            destination: "Patagonia, Chile",
            duration: "8 Days",
            totalEstimatedCost: "₹3,50,000",
            summary: "The ultimate wilderness. Granite spires and turquoise lakes.",
            coordinates: { lat: -51.2533, lon: -72.3392 },
            travelOptions: [
                { type: "FLIGHT", provider: "LATAM", departureTime: "06:00", arrivalTime: "22:00", duration: "24h+", price: "₹1,45,000", departureLocation: "DEL", arrivalLocation: "PNT", bookingLink: "#" },
                { type: "FLIGHT", provider: "United", departureTime: "10:00", arrivalTime: "04:00", duration: "28h", price: "₹1,35,000", departureLocation: "BOM", arrivalLocation: "PNT", bookingLink: "#" },
                { type: "FLIGHT", provider: "Delta", departureTime: "08:00", arrivalTime: "02:00", duration: "30h", price: "₹1,25,000", departureLocation: "BLR", arrivalLocation: "PNT", bookingLink: "#" }
            ],
            accommodation: [
                { name: "Explora Patagonia", type: "Adventure Luxury", rating: "5.0", pricePerNight: "₹1,50,000", location: "Torres del Paine", description: "Within the park.", amenities: ["Guided treks", "Horses"], imageUrl: "https://images.unsplash.com/photo-1517059224940-d4af9eec41b7?auto=format&fit=crop&q=80", checkInTime: "15:00" },
                { name: "EcoCamp Patagonia", type: "Sustainable", rating: "4.8", pricePerNight: "₹65,000", location: "Torres del Paine", description: "Geodesic domes.", amenities: ["Yoga", "Community dining"], imageUrl: "https://images.unsplash.com/photo-1517059224940-d4af9eec41b7?auto=format&fit=crop&q=80", checkInTime: "15:00" },
                { name: "The Singular Patagonia", type: "Industrial Luxury", rating: "4.9", pricePerNight: "₹55,000", location: "Puerto Natales", description: "Converted cold storage.", amenities: ["Museum", "Spa"], imageUrl: "https://images.unsplash.com/photo-1517059224940-d4af9eec41b7?auto=format&fit=crop&q=80", checkInTime: "15:00" },
                { name: "Awasi Patagonia", type: "Relais & Chateaux", rating: "5.0", pricePerNight: "₹2,00,000", location: "Torres del Paine", description: "Private villas.", amenities: ["Private guide", "SUV"], imageUrl: "https://images.unsplash.com/photo-1517059224940-d4af9eec41b7?auto=format&fit=crop&q=80", checkInTime: "15:00" }
            ],
            days: [
                {
                    day: "Day 1", theme: "Granite Giants", activities: [
                        { time: "08:00", title: "Base of Towers Trek", description: "Intense 8-hour hike.", location: "Torres del Paine", estimatedCost: "₹0", bookingRequired: true, coordinates: { lat: -50.9423, lng: -72.9672 } },
                        { time: "19:00", title: "Stargazing Dinner", description: "Patagonian lamb roast.", location: "Explora", estimatedCost: "₹10,000", bookingRequired: false, coordinates: { lat: -51.0667, lng: -72.9833 }, transitFromPrev: { mode: "CAR", duration: "1 hour", cost: "₹0", instruction: "Drive back to the lodge." } }
                    ]
                }
            ],
            dna: { Adventure: 70, Luxury: 10, Culture: 10, Relaxation: 10 }
        }
    },
    {
        id: 'feat_ny_concrete',
        title: "IRON JUNGLE",
        subtitle: "NEW YORK, USA",
        image: "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?auto=format&fit=crop&q=80",
        color: "orange",
        itinerary: {
            destination: "New York, USA",
            duration: "5 Days",
            totalEstimatedCost: "₹2,10,000",
            summary: "The center of the universe. Art, ambition, and relentless energy.",
            coordinates: { lat: 40.7128, lon: -74.0060 },
            travelOptions: [
                { type: "FLIGHT", provider: "Air India", departureTime: "02:00", arrivalTime: "08:00", duration: "15h", price: "₹95,000", departureLocation: "DEL", arrivalLocation: "JFK", bookingLink: "#" },
                { type: "FLIGHT", provider: "United", departureTime: "22:00", arrivalTime: "04:00", duration: "16h", price: "₹1,05,000", departureLocation: "BOM", arrivalLocation: "EWR", bookingLink: "#" },
                { type: "FLIGHT", provider: "Emirates", departureTime: "10:00", arrivalTime: "20:00", duration: "20h", price: "₹88,000", departureLocation: "DEL", arrivalLocation: "JFK", bookingLink: "#" }
            ],
            accommodation: [
                { name: "The Plaza", type: "Historic Luxury", rating: "5.0", pricePerNight: "₹65,000", location: "Central Park", description: "Iconic elegance.", amenities: ["Butler", "Spa"], imageUrl: "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?auto=format&fit=crop&q=80", checkInTime: "15:00" },
                { name: "Public Hotel", type: "Social Luxury", rating: "4.6", pricePerNight: "₹25,000", location: "Lower East Side", description: "Ian Schrager design.", amenities: ["Roof Bar", "Art Space"], imageUrl: "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?auto=format&fit=crop&q=80", checkInTime: "15:00" },
                { name: "1 Hotel Brooklyn Bridge", type: "Eco-Luxury", rating: "4.8", pricePerNight: "₹45,000", location: "Brooklyn", description: "Waterfront views.", amenities: ["Pool", "Farm-to-table"], imageUrl: "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?auto=format&fit=crop&q=80", checkInTime: "15:00" },
                { name: "The Greenwich Hotel", type: "Boutique Luxury", rating: "4.9", pricePerNight: "₹75,000", location: "Tribeca", description: "Robert De Niro owned.", amenities: ["Pool", "Private Courtyard"], imageUrl: "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?auto=format&fit=crop&q=80", checkInTime: "15:00" }
            ],
            days: [
                {
                    day: "Day 1", theme: "Skyline Views", activities: [
                        { time: "10:00", title: "Top of the Rock", description: "Observation deck.", location: "Rockefeller Center", estimatedCost: "₹4,000", bookingRequired: true, coordinates: { lat: 40.7587, lng: -73.9787 } },
                        { time: "19:00", title: "Broadway Show", description: "Premium theater.", location: "Times Square", estimatedCost: "₹15,000", bookingRequired: true, coordinates: { lat: 40.7580, lng: -73.9855 }, transitFromPrev: { mode: "WALK", duration: "15 mins", cost: "₹0", instruction: "Walk south through the city core." } }
                    ]
                }
            ],
            dna: { Adventure: 10, Luxury: 30, Culture: 50, Relaxation: 10 }
        }
    },
    {
        id: 'feat_santorini_white',
        title: "CALDERA PULSE",
        subtitle: "SANTORINI, GREECE",
        image: "https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?auto=format&fit=crop&q=80",
        color: "cyan",
        itinerary: {
            destination: "Santorini, Greece",
            duration: "4 Days",
            totalEstimatedCost: "₹1,95,000",
            summary: "White-washed perfection. Sunset views over the volcanic caldera.",
            coordinates: { lat: 36.3932, lon: 25.4615 },
            travelOptions: [
                { type: "FLIGHT", provider: "Aegean", departureTime: "10:00", arrivalTime: "18:00", duration: "12h", price: "₹65,000", departureLocation: "DEL", arrivalLocation: "JTR", bookingLink: "#" },
                { type: "FLIGHT", provider: "Lufthansa", departureTime: "02:00", arrivalTime: "14:00", duration: "15h", price: "₹72,000", departureLocation: "BOM", arrivalLocation: "JTR", bookingLink: "#" },
                { type: "FLIGHT", provider: "Qatar", departureTime: "08:00", arrivalTime: "20:00", duration: "16h", price: "₹68,000", departureLocation: "DEL", arrivalLocation: "JTR", bookingLink: "#" }
            ],
            accommodation: [
                { name: "Canaves Oia Luxury Suites", type: "Ultra-Luxury", rating: "5.0", pricePerNight: "₹85,000", location: "Oia", description: "Clifftop suites.", amenities: ["Private Pool", "Spa"], imageUrl: "https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?auto=format&fit=crop&q=80", checkInTime: "15:00" },
                { name: "Grace Hotel", type: "Boutique Luxury", rating: "5.0", pricePerNight: "₹1,10,000", location: "Imerovigli", description: "Infinite views.", amenities: ["Pool", "Champagne Lounge"], imageUrl: "https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?auto=format&fit=crop&q=80", checkInTime: "15:00" },
                { name: "Mystique", type: "Luxury Collection", rating: "4.9", pricePerNight: "₹75,000", location: "Oia", description: "Carved into cliffs.", amenities: ["Pool", "Wine Cellar"], imageUrl: "https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?auto=format&fit=crop&q=80", checkInTime: "15:00" },
                { name: "Andronis Luxury Suites", type: "Grand Luxury", rating: "5.0", pricePerNight: "₹90,000", location: "Oia", description: "Cave-style living.", amenities: ["Private Infinity Pool", "Dining"], imageUrl: "https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?auto=format&fit=crop&q=80", checkInTime: "15:00" }
            ],
            days: [
                {
                    day: "Day 1", theme: "Oia Sunsets", activities: [
                        { time: "17:00", title: "Oia Castle Viewpoint", description: "The famous sunset.", location: "Oia", estimatedCost: "₹0", bookingRequired: false, coordinates: { lat: 36.4618, lng: 25.3731 } },
                        { time: "20:00", title: "Ambrosia Dinner", description: "Cliffside Greek cuisine.", location: "Oia", estimatedCost: "₹12,000", bookingRequired: true, coordinates: { lat: 36.4618, lng: 25.3731 }, transitFromPrev: { mode: "WALK", duration: "5 mins", cost: "₹0", instruction: "Walk to the cliff edge." } }
                    ]
                }
            ],
            dna: { Adventure: 10, Luxury: 40, Culture: 20, Relaxation: 30 }
        }
    },
    {
        id: 'feat_bali_zen',
        title: "TEMPLE MIST",
        subtitle: "BALI, INDONESIA",
        image: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&q=80",
        color: "emerald",
        itinerary: {
            destination: "Ubud, Bali",
            duration: "6 Days",
            totalEstimatedCost: "₹1,20,000",
            summary: "Spiritual sanctuary. Terraced rice paddies and sacred forest temples.",
            coordinates: { lat: -8.5069, lon: 115.2625 },
            travelOptions: [
                { type: "FLIGHT", provider: "Thai Airways", departureTime: "10:00", arrivalTime: "22:00", duration: "10h", price: "₹35,000", departureLocation: "DEL", arrivalLocation: "DPS", bookingLink: "#" },
                { type: "FLIGHT", provider: "Garuda Indonesia", departureTime: "04:00", arrivalTime: "16:00", duration: "12h", price: "₹42,000", departureLocation: "BOM", arrivalLocation: "DPS", bookingLink: "#" },
                { type: "FLIGHT", provider: "Air Asia", departureTime: "06:00", arrivalTime: "18:00", duration: "14h", price: "₹28,000", departureLocation: "DEL", arrivalLocation: "DPS", bookingLink: "#" }
            ],
            accommodation: [
                { name: "Mandapa, a Ritz-Carlton Reserve", type: "Ultra-Luxury", rating: "5.0", pricePerNight: "₹75,000", location: "Ubud", description: "Riverside villas.", amenities: ["Private Pool", "Rice Fields"], imageUrl: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&q=80", checkInTime: "15:00" },
                { name: "Four Seasons Sayan", type: "Design Luxury", rating: "5.0", pricePerNight: "₹65,000", location: "Ubud", description: "Sky bridge entrance.", amenities: ["Yoga", "Ayurveda"], imageUrl: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&q=80", checkInTime: "15:00" },
                { name: "Maya Ubud", type: "Boutique", rating: "4.7", pricePerNight: "₹25,000", location: "Ubud", description: "River valley resort.", amenities: ["Spa", "Pool"], imageUrl: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&q=80", checkInTime: "15:00" },
                { name: "Como Shambhala Estate", type: "Wellness Retreat", rating: "5.0", pricePerNight: "₹80,000", location: "Payangan", description: "Holistic healing.", amenities: ["Hydrotherapy", "Estate paths"], imageUrl: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&q=80", checkInTime: "15:00" }
            ],
            days: [
                {
                    day: "Day 1", theme: "Sacred Forest", activities: [
                        { time: "10:00", title: "Sacred Monkey Forest", description: "Ancient temple sanctuary.", location: "Ubud", estimatedCost: "₹500", bookingRequired: false, coordinates: { lat: -8.5188, lng: 115.2585 } },
                        { time: "14:00", title: "Tegallalang Rice Terrace", description: "Infinite green stairs.", location: "Ubud", estimatedCost: "₹1,000", bookingRequired: false, coordinates: { lat: -8.4333, lng: 115.2833 }, transitFromPrev: { mode: "TAXI", duration: "30 mins", cost: "₹1,500", instruction: "Drive north into the hills." } }
                    ]
                }
            ],
            dna: { Adventure: 30, Luxury: 20, Culture: 20, Relaxation: 30 }
        }
    },
    {
        id: 'feat_paris_noir',
        title: "SILK SHADOW",
        subtitle: "PARIS, FRANCE",
        image: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&q=80",
        color: "orange",
        itinerary: {
            destination: "Paris, France",
            duration: "5 Days",
            totalEstimatedCost: "₹2,30,000",
            summary: "The city of light, reimagined in monochrome elegance.",
            coordinates: { lat: 48.8566, lon: 2.3522 },
            travelOptions: [
                { type: "FLIGHT", provider: "Air France", departureTime: "10:00", arrivalTime: "16:00", duration: "9h", price: "₹75,000", departureLocation: "DEL", arrivalLocation: "CDG", bookingLink: "#" },
                { type: "FLIGHT", provider: "Emirates", departureTime: "04:00", arrivalTime: "18:00", duration: "16h", price: "₹62,000", departureLocation: "BOM", arrivalLocation: "CDG", bookingLink: "#" },
                { type: "FLIGHT", provider: "Vistara", departureTime: "06:00", arrivalTime: "14:00", duration: "10h", price: "₹68,000", departureLocation: "DEL", arrivalLocation: "CDG", bookingLink: "#" }
            ],
            accommodation: [
                { name: "Hôtel Ritz Paris", type: "Historic Luxury", rating: "5.0", pricePerNight: "₹1,20,000", location: "Place Vendôme", description: "The height of French luxury.", amenities: ["Pool", "Hemingway Bar"], imageUrl: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&q=80", checkInTime: "15:00" },
                { name: "Hôtel Costes", type: "Boutique Luxury", rating: "4.8", pricePerNight: "₹65,000", location: "St. Honoré", description: "Chic, dark, and social.", amenities: ["Patio", "Music Lounge"], imageUrl: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&q=80", checkInTime: "15:00" },
                { name: "The Hoxton, Paris", type: "Lifestyle", rating: "4.5", pricePerNight: "₹25,000", location: "Sentier", description: "Industrial cool.", amenities: ["Bar", "Courtyard"], imageUrl: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&q=80", checkInTime: "14:00" },
                { name: "Shangri-La Paris", type: "Palatial", rating: "5.0", pricePerNight: "₹95,000", location: "Trocadéro", description: "Direct Eiffel Tower views.", amenities: ["Garden", "Nile-inspired Pool"], imageUrl: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&q=80", checkInTime: "15:00" }
            ],
            days: [
                {
                    day: "Day 1", theme: "Art & Light", activities: [
                        { time: "10:00", title: "Louvre Museum Private", description: "The world's greatest art.", location: "Louvre", estimatedCost: "₹15,000", bookingRequired: true, coordinates: { lat: 48.8606, lng: 2.3376 } },
                        { time: "20:00", title: "Seine River Cruise", description: "Gourmet dinner on water.", location: "Seine", estimatedCost: "₹12,000", bookingRequired: true, coordinates: { lat: 48.8584, lng: 2.2945 }, transitFromPrev: { mode: "TAXI", duration: "20 mins", cost: "₹2,500", instruction: "Drive along the riverbank." } }
                    ]
                }
            ],
            dna: { Adventure: 10, Luxury: 30, Culture: 50, Relaxation: 10 }
        }
    },
    {
        id: 'feat_swiss_peak',
        title: "ALPINE CORE",
        subtitle: "ZERMATT, SWITZERLAND",
        image: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&q=80",
        color: "cyan",
        itinerary: {
            destination: "Zermatt, Switzerland",
            duration: "6 Days",
            totalEstimatedCost: "₹3,80,000",
            summary: "Crystal peaks and precision engineering in the heart of the Alps.",
            coordinates: { lat: 46.0207, lon: 7.7491 },
            travelOptions: [
                { type: "FLIGHT", provider: "Swiss Air", departureTime: "10:00", arrivalTime: "16:00", duration: "9h", price: "₹85,000", departureLocation: "DEL", arrivalLocation: "ZRH", bookingLink: "#" },
                { type: "TRAIN", provider: "SBB", departureTime: "17:00", arrivalTime: "20:30", duration: "3.5h", price: "₹12,000", departureLocation: "ZRH", arrivalLocation: "ZER", bookingLink: "#" }
            ],
            accommodation: [
                { name: "The Omnia", type: "Design Luxury", rating: "5.0", pricePerNight: "₹85,000", location: "Zermatt Center", description: "Mountain lodge rebooted.", amenities: ["Heli-pad", "Library"], imageUrl: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&q=80", checkInTime: "15:00" },
                { name: "Riffelalp Resort 2222m", type: "Ski-in Luxury", rating: "4.9", pricePerNight: "₹75,000", location: "Gornergrat", description: "Highest tram in Europe.", amenities: ["Pool", "Ski-in"], imageUrl: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&q=80", checkInTime: "15:00" }
            ],
            days: [
                {
                    day: "Day 1", theme: "Matterhorn Peak", activities: [
                        { time: "09:00", title: "Gornergrat Railway", description: "Highest open-air rack railway.", location: "Gornergrat", estimatedCost: "₹8,000", bookingRequired: true, coordinates: { lat: 45.9833, lng: 7.7819 } }
                    ]
                }
            ],
            dna: { Adventure: 40, Luxury: 30, Culture: 10, Relaxation: 20 }
        }
    },
    {
        id: 'feat_dubai_height',
        title: "GOLDEN SPIRE",
        subtitle: "DUBAI, UAE",
        image: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&q=80",
        color: "orange",
        itinerary: {
            destination: "Dubai, UAE",
            duration: "5 Days",
            totalEstimatedCost: "₹2,60,000",
            summary: "Hyper-luxury in the desert. Vertical cities and artificial islands.",
            coordinates: { lat: 25.2048, lon: 55.2708 },
            travelOptions: [
                { type: "FLIGHT", provider: "Emirates", departureTime: "10:00", arrivalTime: "13:00", duration: "3h", price: "₹25,000", departureLocation: "BOM", arrivalLocation: "DXB", bookingLink: "#" }
            ],
            accommodation: [
                { name: "Burj Al Arab", type: "Ultra-Luxury", rating: "5.0", pricePerNight: "₹1,50,000", location: "Jumeirah", description: "The world's only 7-star hotel.", amenities: ["Butler", "Heli-pad"], imageUrl: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&q=80", checkInTime: "15:00" }
            ],
            days: [
                {
                    day: "Day 1", theme: "Sky High", activities: [
                        { time: "14:00", title: "Burj Khalifa At the Top", description: "Level 148 entry.", location: "Downtown Dubai", estimatedCost: "₹12,000", bookingRequired: true, coordinates: { lat: 25.1972, lng: 55.2744 } }
                    ]
                }
            ],
            dna: { Adventure: 10, Luxury: 60, Culture: 10, Relaxation: 20 }
        }
    },
    {
        id: 'feat_kyoto_gate',
        title: "ZEN GARDEN",
        subtitle: "KYOTO, JAPAN",
        image: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&q=80",
        color: "emerald",
        itinerary: {
            destination: "Kyoto, Japan",
            duration: "6 Days",
            totalEstimatedCost: "₹2,15,000",
            summary: "Timeless tradition. Bamboo forests and thousand-year-old shrines.",
            coordinates: { lat: 35.0116, lon: 135.7681 },
            travelOptions: [], accommodation: [], days: [],
            dna: { Adventure: 10, Luxury: 20, Culture: 50, Relaxation: 20 }
        }
    },
    {
        id: 'feat_lofoten_arctic',
        title: "NORTH STAR",
        subtitle: "LOFOTEN, NORWAY",
        image: "https://images.unsplash.com/photo-1520623261391-7f99472ee10d?auto=format&fit=crop&q=80",
        color: "cyan",
        itinerary: {
            destination: "Lofoten Islands, Norway",
            duration: "7 Days",
            totalEstimatedCost: "₹2,85,000",
            summary: "Arctic fjords and fishing villages under the midnight sun.",
            coordinates: { lat: 68.3333, lon: 14.6667 },
            travelOptions: [], accommodation: [], days: [],
            dna: { Adventure: 50, Luxury: 10, Culture: 10, Relaxation: 30 }
        }
    },
    {
        id: 'feat_machu_picchu',
        title: "LOST PATH",
        subtitle: "MACHU PICCHU, PERU",
        image: "https://images.unsplash.com/photo-1526392060635-9d6019884377?auto=format&fit=crop&q=80",
        color: "orange",
        itinerary: {
            destination: "Machu Picchu, Peru",
            duration: "8 Days",
            totalEstimatedCost: "₹2,40,000",
            summary: "Citadel in the clouds. The mystery of the Inca empire revealed.",
            coordinates: { lat: -13.1631, lon: -72.5450 },
            travelOptions: [], accommodation: [], days: [],
            dna: { Adventure: 60, Luxury: 10, Culture: 30, Relaxation: 0 }
        }
    },
    {
        id: 'feat_serengeti_wild',
        title: "GREAT ROAR",
        subtitle: "SERENGETI, TANZANIA",
        image: "https://images.unsplash.com/photo-1516426122078-c23e76319801?auto=format&fit=crop&q=80",
        color: "emerald",
        itinerary: {
            destination: "Serengeti, Tanzania",
            duration: "6 Days",
            totalEstimatedCost: "₹3,20,000",
            summary: "The primal pulse. Witness the great migration across the endless plains.",
            coordinates: { lat: -2.3333, lon: 34.8333 },
            travelOptions: [], accommodation: [], days: [],
            dna: { Adventure: 60, Luxury: 10, Culture: 10, Relaxation: 20 }
        }
    }
];