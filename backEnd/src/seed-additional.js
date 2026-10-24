const { DataSource } = require('typeorm');

const ds = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'abduselam',
  database: process.env.DB_NAME || 'travel_tour_db',
});

async function run() {
  await ds.initialize();
  console.log('Connected to PostgreSQL database.');

  const ownerRes = await ds.query("SELECT id FROM users WHERE email = 'owner@askdigital.et'");
  const ownerId = ownerRes[0]?.id;

  // 1. Update Lake Tana gallery with real local photos from Bahir Dar & Blue Nile Falls
  await ds.query(
    `UPDATE destinations
     SET gallery_images = $1
     WHERE slug = 'lake-tana-blue-nile-bahir-dar'`,
    [
      JSON.stringify([
        '/images/destinations/blue-nile-falls-tis-abay-close.jpg',
        '/images/destinations/bahir-dar-palm-avenue.jpg',
        '/images/destinations/lake-tana-bahir-dar-boats.jpg',
        '/images/destinations/blue-nile-falls-panorama.jpg',
        '/images/destinations/bahir-dar-promenade-palms.jpg',
      ]),
    ]
  );
  console.log('Updated Lake Tana & Blue Nile Falls with authentic photos.');

  // 2. Additional destinations to insert
  const newDests = [
    {
      title: 'Gondar: Royal Enclosure of Fasilides & Medieval Castles',
      slug: 'gondar-castles-fasil-ghebbi',
      region: 'Amhara',
      short_description: 'Explore the "Camelot of Africa", featuring 17th-century fairy-tale stone castles, royal bath, and winged angel murals.',
      description: 'Gondar served as the imperial capital of Ethiopia from 1636 until the mid-19th century. Within the famous Royal Enclosure (Fasil Ghebbi), walk amongst towering stone palaces, banquet halls, libraries, and ancient battlements built by Emperor Fasilides and his successors. Admire the renowned ceiling of Debre Berhan Selassie church painted with hundreds of winged angel faces, and visit the historic Fasilides Bath immersed in giant sycamore tree roots.',
      base_price: 19500.00,
      duration_days: 3,
      capacity: 25,
      popularity_score: 94,
      status: 'ACTIVE',
      gallery_images: [
        '/images/destinations/gondar-fasilides-castle-unesco.jpg',
        '/images/destinations/gondar-fasil-ghebbi-arch.jpg'
      ],
      itinerary: [
        { day: 1, title: 'Arrival & Fasil Ghebbi Royal Enclosure', activities: 'Arrive in Gondar, hotel check-in. Guided exploration through the stone palaces and castles of Emperor Fasilides, Iyasu I, and Empress Mentewab.' },
        { day: 2, title: 'Debre Berhan Selassie & Fasilides Bath', activities: 'Morning visit to the magnificent church of Debre Berhan Selassie with its famous winged cherub ceiling. Afternoon visit to the historic sunken Fasilides Bath surrounded by ancient banyan roots.' },
        { day: 3, title: 'Kuskuam Complex & Departure', activities: 'Tour the royal palace ruins of Empress Mentewab at Kuskuam on the hills overlooking Gondar. Traditional tej house visit and airport transfer.' }
      ],
      inclusions: ['4-star hotel accommodation with breakfast', 'All palace and church admission permits', 'Accredited English-speaking historical guide', 'Private AC minivan transportation'],
      exclusions: ['International & domestic airfare', 'Personal souvenir expenses']
    },
    {
      title: 'Addis Ababa: Diplomatic Capital & Cultural Discovery',
      slug: 'addis-ababa-diplomatic-cultural-tour',
      region: 'Addis Ababa',
      short_description: "Discover Ethiopia's dynamic capital: ancestral home of Lucy, panoramic Entoto mountain, modern museums, and lively culture.",
      description: 'Addis Ababa is the vibrant political and diplomatic heart of Africa, hosting the African Union headquarters and United Nations ECA. Journey through the National Museum to meet 3.2-million-year-old "Lucy" (Dinknesh), ascend Entoto Park for pine-scented panoramas of the metropolis, visit the futuristic Ethiopia Science Museum, Friendship Park, and navigate Mercato, the largest open-air market on the African continent.',
      base_price: 11500.00,
      duration_days: 2,
      capacity: 30,
      popularity_score: 91,
      status: 'ACTIVE',
      gallery_images: [
        '/images/destinations/addis-ababa-science-museum-skyline.jpg',
        '/images/destinations/addis-ababa-night-cbe-tower.jpg',
        '/images/destinations/addis-ababa-africa-map-monument.jpg'
      ],
      itinerary: [
        { day: 1, title: 'Lucy, Science Museum & Friendship Park', activities: 'Morning visit to the National Museum of Ethiopia to view Lucy (Dinknesh). Tour the modern Ethiopia Science Museum, Friendship Park, and the iconic CBE Tower skyline.' },
        { day: 2, title: 'Entoto Panoramic Mountain & Mercato', activities: 'Scenic ascent to Entoto Park for breathtaking city vistas and eucalyptus trails. Afternoon guided cultural walk through Mercato spice markets and traditional coffee tasting.' }
      ],
      inclusions: ['Private city van with driver', 'National Museum & Science Museum entry', 'Professional city guide', 'Authentic Ethiopian dinner with live folkloric dance show'],
      exclusions: ['Personal purchases', 'Alcoholic drinks']
    },
    {
      title: 'Lake Hawassa & Great Rift Valley Pelican Safari',
      slug: 'lake-hawassa-rift-valley-pelicans',
      region: 'Sidama',
      short_description: 'Morning boat safaris encountering thousands of white pelicans, Lake Hawassa fish market, and Sidama coffee farm trails.',
      description: 'Located in the scenic Sidama Region along the Great Rift Valley, Hawassa is famous for its serene freshwater lake and thriving birdlife. Experience sunrise boat rides surrounded by huge flocks of Great White Pelicans, storks, and fish eagles. Visit the lively morning fish market where local fishermen grill fresh Nile tilapia, wander the forested shores alive with Colobus monkeys, and taste world-famous organic Sidama single-origin coffee right from the source.',
      base_price: 14500.00,
      duration_days: 2,
      capacity: 20,
      popularity_score: 87,
      status: 'ACTIVE',
      gallery_images: [
        '/images/destinations/lake-hawassa-pelicans-rift-valley.jpg',
        '/images/destinations/ethiopian-highlands-green.jpg'
      ],
      itinerary: [
        { day: 1, title: 'Lake Hawassa Boat Cruise & Fish Market', activities: 'Depart for Hawassa. Private motorboat cruise observing thousands of Great White Pelicans and hippos. Walk the shores to see black-and-white Colobus monkeys.' },
        { day: 2, title: 'Sidama Specialty Coffee Plantation & Return', activities: 'Guided tour of an organic Sidama coffee farm, participating in the traditional harvest and roasting ceremony. Scenic return drive along the Rift Valley lakes.' }
      ],
      inclusions: ['Lakeside resort lodging', 'Private boat safari fees', 'Sidama coffee farm tasting tour', 'Local naturalist guide'],
      exclusions: ['Personal gear', 'Tips']
    },
    {
      title: 'Wolaita: The Land of 50 Kings & Ajora Waterfalls',
      slug: 'wolaita-land-of-50-kings-ajora',
      region: 'South Ethiopia',
      short_description: 'Journey into the Land of 50 Kings: Mount Damota hiking, King Tona historical defenses, and majestic twin Ajora waterfalls.',
      description: 'Wolaita is a realm of lush emerald volcanic hills and profound royal heritage, historically ruled by the formidable Dynasty of 50 Kings. Stand before Mount Damota, explore the massive 19th-century defensive moats constructed by King Tona, hike to the thunderous twin Ajora Waterfalls cascading over 100 meters into deep gorges, and experience the warm hospitality, traditional bamboo architecture, and unique polyphonic music of the Wolaita people.',
      base_price: 16800.00,
      duration_days: 3,
      capacity: 18,
      popularity_score: 89,
      status: 'ACTIVE',
      gallery_images: [
        '/images/destinations/wolaita-land-of-50-kings.jpg',
        '/images/destinations/ethiopian-highlands-green.jpg'
      ],
      itinerary: [
        { day: 1, title: 'Arrival in Sodo & Mount Damota Panorama', activities: 'Arrive in Wolaita Sodo. Afternoon hike up Mount Damota (2,900m) enjoying panoramic vistas across the southern rift valleys.' },
        { day: 2, title: 'Ajora Twin Waterfalls & King Tona Heritage', activities: 'Excursion to the breathtaking Ajora twin waterfalls plunging through deep green forested cliffs. Visit the King Tona defensive moats and traditional Wolaita palace grounds.' },
        { day: 3, title: 'Cultural Homesteads & Departure', activities: 'Morning visit to local artisan bamboo weavers and potteries. Traditional Wolaita banquet with "Kotta" and "Kachano" before departure.' }
      ],
      inclusions: ['4WD transportation', 'All waterfall & heritage site permits', 'Local Wolaita cultural guide', 'Lodge accommodation with breakfast'],
      exclusions: ['Snacks and beverages', 'Personal tipping']
    },
    {
      title: 'Bale Mountains: Afro-Alpine Wilderness & Red Fox Safari',
      slug: 'bale-mountains-afro-alpine-trek',
      region: 'Oromia',
      short_description: "Trek Africa's highest plateau across Sanetti, home to the rare Ethiopian Wolf, and hike ancient Harenna cloud forests.",
      description: 'Bale Mountains National Park encompasses the largest area of afro-alpine habitat on the African continent. Across the stark 4,000-meter Sanetti Plateau, watch the endangered Ethiopian wolf stalking giant mole-rats among giant lobelia plants. Descend into the dense tropical Harenna forest shrouded in mist, rich in endemic bird species, wild forest coffee, and wild lions.',
      base_price: 26500.00,
      duration_days: 4,
      capacity: 16,
      popularity_score: 90,
      status: 'ACTIVE',
      gallery_images: [
        'https://images.unsplash.com/photo-1516426122078-c23e76319801?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=1200&q=80'
      ],
      itinerary: [
        { day: 1, title: 'Goba & Dinsho HQ', activities: "Arrive at Dinsho headquarters. Woodland walk spotting Mountain Nyala and Menelik's Bushbuck." },
        { day: 2, title: 'Sanetti Plateau & Mount Tullu Dimtu', activities: 'Drive across Sanetti Plateau (highest all-weather road in Africa). Summit Mount Tullu Dimtu (4,377m) and track Ethiopian wolf packs.' },
        { day: 3, title: 'Harenna Forest & Bamboo Waterfalls', activities: 'Descend the dramatic Harenna escarpment into lush mist forest. Hike along bamboo waterfalls and visit wild coffee collectors.' },
        { day: 4, title: 'Return via Rift Valley', activities: 'Scenic return journey with birdwatching stops at Lake Ziway.' }
      ],
      inclusions: ['Park scout & wildlife tracker', '4x4 mountain transportation', 'Comfortable lodge accommodation', 'All park conservation fees'],
      exclusions: ['Personal hiking gear', 'Tips for trackers']
    },
    {
      title: 'Harar Jugol: The Historic 4th Holy City & Hyena Feeding',
      slug: 'harar-jugol-walled-city-safari',
      region: 'Harari',
      short_description: 'UNESCO 10th-century walled city of 99 mosques, labyrinthine colorful alleys, and the nightly wild hyena feeding ritual.',
      description: "Considered the fourth holiest city of Islam, Harar Jugol is enclosed by a massive 16th-century rampart with five historic gates. Wander through 368 narrow alleys lined with traditional Harari guest houses, explore vibrant spice souks, visit the French poet Arthur Rimbaud mansion, and witness the thrilling nightly spectacle of the 'Hyena Men' hand-feeding wild spotted hyenas outside the city walls.",
      base_price: 22000.00,
      duration_days: 3,
      capacity: 18,
      popularity_score: 93,
      status: 'ACTIVE',
      gallery_images: [
        'https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=1200&q=80'
      ],
      itinerary: [
        { day: 1, title: 'Harar Walled City Gates & Rimbaud House', activities: 'Arrive via Dire Dawa. Enter the fortified city gates, visit the Arthur Rimbaud Cultural Center and Ras Mekonnen palace.' },
        { day: 2, title: 'Harari Traditional Houses & Night Hyena Feeding', activities: "Tour vibrant textile and spice markets. In the evening, witness the legendary Harar Hyena Man calling and feeding wild hyenas by mouth." },
        { day: 3, title: 'Coffee Mills & Return', activities: 'Explore the historic Harari coffee processing and chat markets before departure transfer to Dire Dawa airport.' }
      ],
      inclusions: ['Traditional Harari heritage guest house', 'Licensed Harari historian guide', 'Hyena feeding event admission', 'Airport transfers from Dire Dawa'],
      exclusions: ['Direct camera tipping fees', 'Alcohol']
    },
    {
      title: 'Tigray: Gheralta Rock Churches & Ancient Axum',
      slug: 'tigray-gheralta-churches-axum',
      region: 'Tigray',
      short_description: 'Ascend sandstone pinnacles to cliffside cave churches in Gheralta and discover Axum\'s ancient monolithic stelae.',
      description: 'The Gheralta mountains rise like giant rust-red cathedrals from the Tigray plateau. Scale the breathtaking sandstone face to Abuna Yemata Guh, carved high inside a cliff pinnacle with ancient frescoes. Continue to holy Axum, cradle of Ethiopian civilization, to stand before towering 1,700-year-old granite obelisks and the revered Church of St. Mary of Zion, ancient home of the Ark of the Covenant.',
      base_price: 29000.00,
      duration_days: 4,
      capacity: 15,
      popularity_score: 92,
      status: 'ACTIVE',
      gallery_images: [
        'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=1200&q=80'
      ],
      itinerary: [
        { day: 1, title: 'Arrival & Gheralta Escarpment', activities: 'Fly to Mekele, transfer to Hawzen beneath the red cliffs of Gheralta. Sunset photography over the plateau.' },
        { day: 2, title: 'Abuna Yemata Guh & Mariam Korkor', activities: 'Morning guided climb with safety harnesses to the iconic cliff-ledge church of Abuna Yemata Guh. Afternoon hike to Mariam Korkor.' },
        { day: 3, title: 'Yeha Temple & Sacred Axum', activities: 'Drive via the 2,500-year-old pre-Christian temple of Yeha to Axum. Visit the UNESCO Northern Stelae Field.' },
        { day: 4, title: 'Ark of Zion & Queen of Sheba Bath', activities: 'Morning tour of St. Mary of Zion Chapel of the Tablet and the Queen of Sheba reservoir (Mai Shum). Airport transfer.' }
      ],
      inclusions: ['Mountain climbing guides & local church scouts', '4WD transportation', '3 nights hotel & mountain lodge lodging', 'All historical church and UNESCO permits'],
      exclusions: ['Personal climbing footwear', 'Tipping']
    }
  ];

  for (const d of newDests) {
    const existing = await ds.query('SELECT id FROM destinations WHERE slug = $1', [d.slug]);
    if (existing.length === 0) {
      await ds.query(
        `INSERT INTO destinations (
          id, title, slug, region, short_description, description,
          base_price, duration_days, capacity, popularity_score,
          status, gallery_images, itinerary, inclusions, exclusions,
          created_by, created_at, updated_at
        ) VALUES (
          gen_random_uuid(), $1, $2, $3, $4, $5,
          $6, $7, $8, $9,
          $10, $11, $12, $13, $14,
          $15, NOW(), NOW()
        )`,
        [
          d.title, d.slug, d.region, d.short_description, d.description,
          d.base_price, d.duration_days, d.capacity, d.popularity_score,
          d.status, JSON.stringify(d.gallery_images), JSON.stringify(d.itinerary),
          JSON.stringify(d.inclusions), JSON.stringify(d.exclusions),
          ownerId
        ]
      );
      console.log('Inserted:', d.title);
    } else {
      console.log('Already exists:', d.title);
    }
  }

  const all = await ds.query('SELECT title, region, base_price FROM destinations ORDER BY created_at DESC');
  console.log(`\nSuccessfully populated! Total destinations in DB: ${all.length}`);
  all.forEach(d => console.log(`- ${d.title} (${d.region}) : ${d.base_price} ETB`));

  await ds.destroy();
}

run().catch(e => {
  console.error(e);
  process.exit(1);
});

