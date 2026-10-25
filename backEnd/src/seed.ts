import { DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from './entities/user.entity';
import { Role } from './entities/role.entity';
import { RolePermission } from './entities/role-permission.entity';
import { UserRole } from './entities/user-role.entity';
import { Agent } from './entities/agent.entity';
import { Client } from './entities/client.entity';
import { Destination } from './entities/destination.entity';
import { PriceRule } from './entities/price-rule.entity';
import { Booking } from './entities/booking.entity';
import { BookingStatusHistory } from './entities/booking-status-history.entity';
import { WalletTransaction } from './entities/wallet-transaction.entity';
import { Notification } from './entities/notification.entity';
import { Conversation } from './entities/conversation.entity';
import { Message } from './entities/message.entity';
import { AuditLog } from './entities/audit-log.entity';
import { AppSetting } from './entities/app-setting.entity';
import { RefreshSession } from './entities/refresh-session.entity';
import { Payment } from './entities/payment.entity';
import { PendingRegistration } from './entities/pending-registration.entity';
import { AgentReferralCode } from './entities/agent-referral-code.entity';
import { Permission, PermissionScope } from './common/enums/permissions.enum';
import {
  UserStatus,
  DestinationStatus,
  BookingStatus,
  WalletTxType,
  PriceAdjustType,
  ConversationType,
} from './common/enums/domain.enums';

async function seed() {
  const dataSource = new DataSource({
    type: 'postgres',
    ...(process.env.DATABASE_URL
      ? { url: process.env.DATABASE_URL }
      : {
          host: process.env.DB_HOST || '127.0.0.1',
          port: parseInt(process.env.DB_PORT || '5432', 10),
          username: process.env.DB_USER || 'postgres',
          password: process.env.DB_PASSWORD || 'abduselam',
          database: process.env.DB_NAME || 'travel_tour_db',
        }),
    ssl:
      process.env.DB_SSL === 'true' ||
      (process.env.DATABASE_URL &&
        !process.env.DATABASE_URL.includes('localhost') &&
        !process.env.DATABASE_URL.includes('127.0.0.1'))
        ? { rejectUnauthorized: false }
        : false,
    entities: [
      User,
      Role,
      RolePermission,
      UserRole,
      RefreshSession,
      Agent,
      Client,
      Destination,
      PriceRule,
      Booking,
      BookingStatusHistory,
      WalletTransaction,
      Payment,
      Notification,
      Conversation,
      Message,
      AuditLog,
      AppSetting,
      PendingRegistration,
      AgentReferralCode,
    ],
    synchronize: true,
  });

  await dataSource.initialize();
  console.log('Database connected for seeding.');

  // 1. Roles
  const rolesData = [
    { role_name: 'OWNER', description: 'System Owner - Executive Authority', is_system: true },
    { role_name: 'MANAGER', description: 'Agency Manager - Operational Authority', is_system: true },
    { role_name: 'AGENT', description: 'Travel Agent - Partner with unique referral code', is_system: true },
    { role_name: 'CLIENT', description: 'Client / Traveler - Public catalog and bookings', is_system: true },
  ];

  const roleEntities: Record<string, Role> = {};
  for (const r of rolesData) {
    let role = await dataSource.getRepository(Role).findOne({ where: { role_name: r.role_name } });
    if (!role) {
      role = await dataSource.getRepository(Role).save(dataSource.getRepository(Role).create(r));
    }
    roleEntities[r.role_name] = role;
  }
  console.log('Roles verified.');

  // 2. Role-Permission Matrix (Section 1.3.5)
  const matrix: { role: string; permission: Permission; scope: PermissionScope }[] = [
    // OWNER
    { role: 'OWNER', permission: Permission.MANAGER_CREATE, scope: PermissionScope.ANY },
    { role: 'OWNER', permission: Permission.MANAGER_ASSIGN, scope: PermissionScope.ANY },
    { role: 'OWNER', permission: Permission.MANAGER_SUSPEND, scope: PermissionScope.ANY },
    { role: 'OWNER', permission: Permission.MANAGER_REVOKE, scope: PermissionScope.ANY },
    { role: 'OWNER', permission: Permission.ROLE_READ, scope: PermissionScope.ANY },
    { role: 'OWNER', permission: Permission.ROLE_MANAGE, scope: PermissionScope.ANY },
    { role: 'OWNER', permission: Permission.USER_READ, scope: PermissionScope.ANY },
    { role: 'OWNER', permission: Permission.DESTINATION_READ_PUBLIC, scope: PermissionScope.ANY },
    { role: 'OWNER', permission: Permission.DESTINATION_CREATE, scope: PermissionScope.ANY },
    { role: 'OWNER', permission: Permission.DESTINATION_UPDATE, scope: PermissionScope.ANY },
    { role: 'OWNER', permission: Permission.DESTINATION_DELETE, scope: PermissionScope.ANY },
    { role: 'OWNER', permission: Permission.PRICING_MANAGE, scope: PermissionScope.ANY },
    { role: 'OWNER', permission: Permission.AGENT_CREATE, scope: PermissionScope.ANY },
    { role: 'OWNER', permission: Permission.AGENT_READ, scope: PermissionScope.ANY },
    { role: 'OWNER', permission: Permission.AGENT_UPDATE, scope: PermissionScope.ANY },
    { role: 'OWNER', permission: Permission.AGENT_DEACTIVATE, scope: PermissionScope.ANY },
    { role: 'OWNER', permission: Permission.AGENT_PERFORMANCE_READ, scope: PermissionScope.ANY },
    { role: 'OWNER', permission: Permission.CLIENT_READ, scope: PermissionScope.ANY },
    { role: 'OWNER', permission: Permission.BOOKING_READ, scope: PermissionScope.ANY },
    { role: 'OWNER', permission: Permission.BOOKING_CANCEL, scope: PermissionScope.ANY },
    { role: 'OWNER', permission: Permission.WALLET_READ, scope: PermissionScope.ANY },
    { role: 'OWNER', permission: Permission.REPORT_READ, scope: PermissionScope.ANY },
    { role: 'OWNER', permission: Permission.REPORT_EXPORT, scope: PermissionScope.ANY },
    { role: 'OWNER', permission: Permission.DASHBOARD_READ, scope: PermissionScope.ANY },
    { role: 'OWNER', permission: Permission.NOTIFICATION_READ, scope: PermissionScope.ANY },
    { role: 'OWNER', permission: Permission.CHAT_MODERATE, scope: PermissionScope.ANY },
    { role: 'OWNER', permission: Permission.AUDIT_READ, scope: PermissionScope.ANY },

    // MANAGER
    { role: 'MANAGER', permission: Permission.AGENT_CREATE, scope: PermissionScope.ANY },
    { role: 'MANAGER', permission: Permission.AGENT_READ, scope: PermissionScope.ANY },
    { role: 'MANAGER', permission: Permission.AGENT_UPDATE, scope: PermissionScope.ANY },
    { role: 'MANAGER', permission: Permission.AGENT_DEACTIVATE, scope: PermissionScope.ANY },
    { role: 'MANAGER', permission: Permission.AGENT_PERFORMANCE_READ, scope: PermissionScope.ANY },
    { role: 'MANAGER', permission: Permission.CLIENT_REGISTER, scope: PermissionScope.ANY },
    { role: 'MANAGER', permission: Permission.CLIENT_READ, scope: PermissionScope.ANY },
    { role: 'MANAGER', permission: Permission.DESTINATION_READ_PUBLIC, scope: PermissionScope.ANY },
    { role: 'MANAGER', permission: Permission.BOOKING_READ, scope: PermissionScope.ANY },
    { role: 'MANAGER', permission: Permission.BOOKING_APPROVE, scope: PermissionScope.ANY },
    { role: 'MANAGER', permission: Permission.BOOKING_REJECT, scope: PermissionScope.ANY },
    { role: 'MANAGER', permission: Permission.BOOKING_COMMENT, scope: PermissionScope.ANY },
    { role: 'MANAGER', permission: Permission.BOOKING_CANCEL, scope: PermissionScope.ANY },
    { role: 'MANAGER', permission: Permission.BOOKING_COMPLETE, scope: PermissionScope.ANY },
    { role: 'MANAGER', permission: Permission.WALLET_READ, scope: PermissionScope.ANY },
    { role: 'MANAGER', permission: Permission.COMMISSION_PAYOUT_PROCESS, scope: PermissionScope.ANY },
    { role: 'MANAGER', permission: Permission.REPORT_READ, scope: PermissionScope.ANY },
    { role: 'MANAGER', permission: Permission.REPORT_EXPORT, scope: PermissionScope.ANY },
    { role: 'MANAGER', permission: Permission.DASHBOARD_READ, scope: PermissionScope.ANY },
    { role: 'MANAGER', permission: Permission.NOTIFICATION_READ, scope: PermissionScope.ANY },
    { role: 'MANAGER', permission: Permission.CHAT_USE, scope: PermissionScope.ANY },
    { role: 'MANAGER', permission: Permission.CHAT_MODERATE, scope: PermissionScope.ANY },
    { role: 'MANAGER', permission: Permission.USER_READ, scope: PermissionScope.TEAM },

    // AGENT
    { role: 'AGENT', permission: Permission.DESTINATION_READ_PUBLIC, scope: PermissionScope.ANY },
    { role: 'AGENT', permission: Permission.AGENT_READ, scope: PermissionScope.OWN },
    { role: 'AGENT', permission: Permission.AGENT_PERFORMANCE_READ, scope: PermissionScope.OWN },
    { role: 'AGENT', permission: Permission.CLIENT_REGISTER, scope: PermissionScope.OWN },
    { role: 'AGENT', permission: Permission.CLIENT_READ, scope: PermissionScope.ASSIGNED },
    { role: 'AGENT', permission: Permission.BOOKING_CREATE, scope: PermissionScope.ASSIGNED },
    { role: 'AGENT', permission: Permission.BOOKING_READ, scope: PermissionScope.ASSIGNED },
    { role: 'AGENT', permission: Permission.WALLET_READ, scope: PermissionScope.OWN },
    { role: 'AGENT', permission: Permission.DASHBOARD_READ, scope: PermissionScope.OWN },
    { role: 'AGENT', permission: Permission.NOTIFICATION_READ, scope: PermissionScope.OWN },
    { role: 'AGENT', permission: Permission.CHAT_USE, scope: PermissionScope.ASSIGNED },
    { role: 'AGENT', permission: Permission.USER_READ, scope: PermissionScope.OWN },

    // CLIENT
    { role: 'CLIENT', permission: Permission.DESTINATION_READ_PUBLIC, scope: PermissionScope.ANY },
    { role: 'CLIENT', permission: Permission.CLIENT_REGISTER, scope: PermissionScope.OWN },
    { role: 'CLIENT', permission: Permission.CLIENT_READ, scope: PermissionScope.OWN },
    { role: 'CLIENT', permission: Permission.BOOKING_CREATE, scope: PermissionScope.OWN },
    { role: 'CLIENT', permission: Permission.BOOKING_READ, scope: PermissionScope.OWN },
    { role: 'CLIENT', permission: Permission.BOOKING_CANCEL, scope: PermissionScope.OWN },
    { role: 'CLIENT', permission: Permission.DASHBOARD_READ, scope: PermissionScope.OWN },
    { role: 'CLIENT', permission: Permission.NOTIFICATION_READ, scope: PermissionScope.OWN },
    { role: 'CLIENT', permission: Permission.CHAT_USE, scope: PermissionScope.ASSIGNED },
    { role: 'CLIENT', permission: Permission.USER_READ, scope: PermissionScope.OWN },
  ];

  for (const m of matrix) {
    const role = roleEntities[m.role];
    if (!role) continue;
    let rp = await dataSource.getRepository(RolePermission).findOne({
      where: { role_id: role.id, permission: m.permission },
    });
    if (!rp) {
      rp = dataSource.getRepository(RolePermission).create({
        role_id: role.id,
        permission: m.permission,
        scope: m.scope,
      });
      await dataSource.getRepository(RolePermission).save(rp);
    }
  }
  console.log('Role-Permission matrix seeded.');

  // 3. Seed Users
  // Owner
  const ownerEmail = 'owner@askdigital.et';
  let owner = await dataSource.getRepository(User).findOne({ where: { email: ownerEmail } });
  if (!owner) {
    owner = await dataSource.getRepository(User).save(
      dataSource.getRepository(User).create({
        name: 'Abebe Bekele (System Owner)',
        email: ownerEmail,
        phone: '+251911223344',
        password_hash: await bcrypt.hash('Owner@2026!', 12),
        status: UserStatus.ACTIVE,
        email_verified_at: new Date(),
      }),
    );
    await dataSource.getRepository(UserRole).save({
      user_id: owner.id,
      role_id: roleEntities['OWNER'].id,
    });
  }

  // Manager
  const managerEmail = 'manager@askdigital.et';
  let manager = await dataSource.getRepository(User).findOne({ where: { email: managerEmail } });
  if (!manager) {
    manager = await dataSource.getRepository(User).save(
      dataSource.getRepository(User).create({
        name: 'Selamawit Tadesse (Manager)',
        email: managerEmail,
        phone: '+251922334455',
        password_hash: await bcrypt.hash('Manager@2026!', 12),
        status: UserStatus.ACTIVE,
        email_verified_at: new Date(),
      }),
    );
    await dataSource.getRepository(UserRole).save({
      user_id: manager.id,
      role_id: roleEntities['MANAGER'].id,
    });
  }

  // Agent
  const agentEmail = 'agent@askdigital.et';
  let agentUser = await dataSource.getRepository(User).findOne({ where: { email: agentEmail } });
  let agentProfile: Agent;
  if (!agentUser) {
    agentUser = await dataSource.getRepository(User).save(
      dataSource.getRepository(User).create({
        name: 'Dawit Haile (Travel Agent)',
        email: agentEmail,
        phone: '+251933445566',
        password_hash: await bcrypt.hash('Agent@2026!', 12),
        status: UserStatus.ACTIVE,
        email_verified_at: new Date(),
      }),
    );
    await dataSource.getRepository(UserRole).save({
      user_id: agentUser.id,
      role_id: roleEntities['AGENT'].id,
    });

    agentProfile = await dataSource.getRepository(Agent).save(
      dataSource.getRepository(Agent).create({
        user_id: agentUser.id,
        referral_code: 'ETHIOPIA10',
        wallet_balance: 3850.0,
        manager_id: manager.id,
        payout_details: 'Commercial Bank of Ethiopia - Acc: 1000123456789',
      }),
    );
  } else {
    agentProfile = await dataSource.getRepository(Agent).findOne({ where: { user_id: agentUser.id } });
  }

  // Client
  const clientEmail = 'client@gmail.com';
  let clientUser = await dataSource.getRepository(User).findOne({ where: { email: clientEmail } });
  if (!clientUser) {
    clientUser = await dataSource.getRepository(User).save(
      dataSource.getRepository(User).create({
        name: 'Hanna Girma (Traveler)',
        email: clientEmail,
        phone: '+251944556677',
        password_hash: await bcrypt.hash('Client@2026!', 12),
        status: UserStatus.ACTIVE,
        email_verified_at: new Date(),
      }),
    );
    await dataSource.getRepository(UserRole).save({
      user_id: clientUser.id,
      role_id: roleEntities['CLIENT'].id,
    });

    await dataSource.getRepository(Client).save(
      dataSource.getRepository(Client).create({
        user_id: clientUser.id,
        referred_by_agent_id: agentProfile.id,
        referral_code_used: 'ETHIOPIA10',
        onboarding_status: 'ACTIVE',
      }),
    );
  }
  console.log('Seed users verified.');

  // 4. Seed Destinations
  const destinationsData = [
    {
        "title": "Lalibela Rock-Hewn Churches",
        "slug": "lalibela-rock-hewn-churches",
        "region": "Amhara",
        "short_description": "Explore the 12th-century UNESCO World Heritage monolithic churches carved out of red volcanic stone.",
        "description": "Lalibela is a holy town in northern Ethiopia, famed for its extraordinary rock-hewn monolithic churches dating from the 12th and 13th centuries under King Lalibela. Regarded as the \"Eighth Wonder of the World\", these 11 interconnected underground structures include the legendary cruciform Church of St. George (Bete Giyorgis). Experience sacred chants, incense-filled catacombs, and breathtaking mountain vistas.",
        "base_price": 18500,
        "duration_days": 3,
        "capacity": 25,
        "popularity_score": 95,
        status: DestinationStatus.ACTIVE,
        "gallery_images": [
            "https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=1200&q=80",
            "https://images.unsplash.com/photo-1516426122078-c23e76319801?auto=format&fit=crop&w=1200&q=80",
            "https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?auto=format&fit=crop&w=1200&q=80"
        ],
        "itinerary": [
            {
                "day": 1,
                "title": "Arrival & Northern Church Cluster",
                "activities": "Arrive at Lalibela Airport, transfer to hotel with mountain view. Afternoon guided tour of the Northern Group including Bete Medhane Alem and Bete Maryam."
            },
            {
                "day": 2,
                "title": "Eastern Group & Bete Giyorgis",
                "activities": "Explore the Eastern Cluster through underground tunnels. Sunset visit to the iconic Bete Giyorgis (Church of St. George)."
            },
            {
                "day": 3,
                "title": "Yemrehana Krestos & Departure",
                "activities": "Morning excursion to the cave church of Yemrehana Krestos. Traditional coffee ceremony and airport transfer."
            }
        ],
        "inclusions": [
            "Domestic flight transfers",
            "Licensed English-speaking historical guide",
            "Church entry permits",
            "4-star hotel accommodation with breakfast",
            "Private air-conditioned minivan"
        ],
        "exclusions": [
            "International flights",
            "Alcoholic beverages",
            "Personal souvenir purchases"
        ]
    },
    {
        "title": "Simien Mountains Trek & Gelada Baboons",
        "slug": "simien-mountains-trek",
        "region": "Amhara",
        "short_description": "Highland trekking through dramatic escarpments, deep gorges, and encounters with endemic Gelada baboons.",
        "description": "The Simien Mountains National Park is a rugged plateau towering over 4,000 meters, known as the \"Roof of Africa\". Deep precipices drop sheer for 1,500 meters into valleys below. Home to extraordinary wildlife found nowhere else on Earth, including friendly herds of Gelada \"bleeding heart\" baboons, the majestic Walia ibex, and the elusive Ethiopian wolf.",
        "base_price": 24000,
        "duration_days": 4,
        "capacity": 20,
        "popularity_score": 88,
        status: DestinationStatus.ACTIVE,
        "gallery_images": [
            "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=1200&q=80",
            "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80"
        ],
        "itinerary": [
            {
                "day": 1,
                "title": "Debark to Sankaber Camp",
                "activities": "Depart Gondar for Debark HQ. Scenic hike along escarpment edges to Sankaber camp with initial Gelada baboon encounters."
            },
            {
                "day": 2,
                "title": "Jinbar Waterfall & Geech Camp",
                "activities": "Trek across the dramatic 500m Jinbar Waterfall abyss towards Geech plateau across giant lobelia fields."
            },
            {
                "day": 3,
                "title": "Imet Gogo Pinnacle View",
                "activities": "Sunrise ascent to Imet Gogo (3,926m) for the most awe-inspiring 360-degree vista in Africa."
            },
            {
                "day": 4,
                "title": "Chennek & Return",
                "activities": "Scenic wildlife drive watching Walia ibex on sheer cliffs, scenic return drive to Gondar."
            }
        ],
        "inclusions": [
            "Park entrance fees & Scout accompaniment",
            "Full camping gear & mountain cook",
            "Meals during trek",
            "4x4 transport"
        ],
        "exclusions": [
            "Sleeping bag rental (optional)",
            "Gratuities for scouts and porters"
        ]
    },
    {
        "title": "Danakil Depression & Erta Ale Volcano",
        "slug": "danakil-depression-erta-ale",
        "region": "Afar",
        "short_description": "An otherworldly expedition to bubbling lava lakes, vivid sulfur springs, and glowing salt flats.",
        "description": "One of the lowest, hottest, and most geologically hyperactive places on the planet, the Danakil Depression sits 125 meters below sea level. Witness the surreal neon-yellow, green, and turquoise sulfur formations of Dallol, traverse vast blinding white salt pans worked by Afar camel caravans, and peer into the glowing bubbling molten lava lake of Erta Ale shield volcano under the desert stars.",
        "base_price": 35000,
        "duration_days": 4,
        "capacity": 16,
        "popularity_score": 92,
        status: DestinationStatus.ACTIVE,
        "gallery_images": [
            "https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=1200&q=80",
            "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=1200&q=80"
        ],
        "itinerary": [
            {
                "day": 1,
                "title": "Semera to Hamed Ela",
                "activities": "4x4 expedition through the Afar desert rift to the salt-mining village of Hamed Ela."
            },
            {
                "day": 2,
                "title": "Dallol Hydrothermal Fields & Lake Assale",
                "activities": "Explore the extraterrestrial salt chimneys of Dallol and enjoy sunset swimming in the hypersaline Lake Assale."
            },
            {
                "day": 3,
                "title": "Ascent to Erta Ale Volcano",
                "activities": "Drive to Dodom base camp and twilight trek to the crater rim of active Erta Ale lava lake."
            },
            {
                "day": 4,
                "title": "Sunrise Crater & Return to Semera",
                "activities": "Sunrise photography at the caldera rim followed by return convoy to Semera airport."
            }
        ],
        "inclusions": [
            "4x4 Land Cruisers with AC",
            "Armed Afar security escorts & guides",
            "Camp gear and desert chef",
            "Unlimited bottled mineral water"
        ],
        "exclusions": [
            "Alcoholic drinks",
            "Personal medication"
        ]
    },
    {
        "title": "Lake Tana Monasteries & Blue Nile Falls",
        "slug": "lake-tana-blue-nile-bahir-dar",
        "region": "Amhara",
        "short_description": "Boat cruises across Ethiopia’s largest lake, ancient island monasteries, and the thundering Blue Nile waterfall.",
        "description": "Bahir Dar, set on the southern palm-lined shores of Lake Tana, is the birthplace of the Blue Nile River. Board a private boat to discover medieval monasteries adorned with vibrant biblical murals and historical imperial crowns on lush islands. Later, journey to Tis Abay to witness the smoky thunder of the Blue Nile Falls.",
        "base_price": 12000,
        "duration_days": 2,
        "capacity": 30,
        "popularity_score": 80,
        status: DestinationStatus.ACTIVE,
        "gallery_images": [
            "/images/destinations/blue-nile-falls-tis-abay-close.jpg",
            "/images/destinations/bahir-dar-palm-avenue.jpg",
            "/images/destinations/lake-tana-bahir-dar-boats.jpg",
            "/images/destinations/blue-nile-falls-panorama.jpg",
            "/images/destinations/bahir-dar-promenade-palms.jpg"
        ],
        "itinerary": [
            {
                "day": 1,
                "title": "Lake Tana Boat Cruise",
                "activities": "Full-day motorboat cruise to Zege Peninsula to visit Ura Kidane Mehret and Azwa Maryam monasteries."
            },
            {
                "day": 2,
                "title": "Tis Abay (Blue Nile Falls)",
                "activities": "Scenic morning drive and suspension footbridge hike to the Blue Nile Falls. Afternoon stroll along Bahir Dar promenade."
            }
        ],
        "inclusions": [
            "Private boat charter",
            "All monastery admission fees",
            "Lakeside hotel accommodation",
            "Professional guide"
        ],
        "exclusions": [
            "Tips and personal spending"
        ]
    },
    {
        "title": "Omo Valley Cultural Expedition",
        "slug": "omo-valley-cultural-expedition",
        "region": "South Ethiopia",
        "short_description": "Immersive cultural journey visiting the Hamar, Mursi, and Karo tribal communities along the Great Rift Valley.",
        "description": "The Lower Omo Valley is a living anthropological crossroads preserving ancient traditions, body art, and ceremonies unchanged for generations. Meet the Mursi famed for their clay lip plates, attend a Hamar bull-jumping celebration and women’s Evangadi night dance, and admire the white-chalk body paintings of the Karo overlooking the sweeping Omo River.",
        "base_price": 42000,
        "duration_days": 6,
        "capacity": 12,
        "popularity_score": 85,
        status: DestinationStatus.ACTIVE,
        "gallery_images": [
            "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?auto=format&fit=crop&w=1200&q=80",
            "https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=1200&q=80"
        ],
        "itinerary": [
            {
                "day": 1,
                "title": "Arba Minch & Dorze Villages",
                "activities": "Arrive in Arba Minch, visit high-altitude Dorze elephant-shaped bamboo huts and cotton weavers."
            },
            {
                "day": 2,
                "title": "Lake Chamo Crocodile Market & Konso",
                "activities": "Morning boat safari amongst giant Nile crocodiles, afternoon tour of UNESCO Konso stone-walled terraces."
            },
            {
                "day": 3,
                "title": "Hamar Settlements of Turmi",
                "activities": "Journey deeper south to Turmi; visit traditional Hamar homesteads and witness pottery and body scarification artistry."
            },
            {
                "day": 4,
                "title": "Karo at Korcho Pinnacle",
                "activities": "Excursion to Korcho village with panorama overlooking the Omo River, body painting cultural exchange."
            },
            {
                "day": 5,
                "title": "Mursi Tribe of Mago National Park",
                "activities": "Cross into Mago National Park to visit Mursi villages known for clay lip plates and acacia woodcraft."
            },
            {
                "day": 6,
                "title": "Key Afer Market & Jinka Flight",
                "activities": "Vibrant inter-tribal weekly market in Key Afer, transfer to Jinka airport for return flight."
            }
        ],
        "inclusions": [
            "Specialist cultural tribal guide",
            "Village photography & entry permits",
            "Full board accommodation in eco-lodges",
            "Dedicated 4WD transportation"
        ],
        "exclusions": [
            "Direct tipping for photographed elders",
            "Special event fees (bull jumping ceremony)"
        ]
    },
    {
        "title": "Gondar: Royal Enclosure of Fasilides & Medieval Castles",
        "slug": "gondar-castles-fasil-ghebbi",
        "region": "Amhara",
        "short_description": "Explore the \"Camelot of Africa\", featuring 17th-century fairy-tale stone castles, royal bath, and winged angel murals.",
        "description": "Gondar served as the imperial capital of Ethiopia from 1636 until the mid-19th century. Within the famous Royal Enclosure (Fasil Ghebbi), walk amongst towering stone palaces, banquet halls, libraries, and ancient battlements built by Emperor Fasilides and his successors. Admire the renowned ceiling of Debre Berhan Selassie church painted with hundreds of winged angel faces, and visit the historic Fasilides Bath immersed in giant sycamore tree roots.",
        "base_price": 19500,
        "duration_days": 3,
        "capacity": 25,
        "popularity_score": 94,
        status: DestinationStatus.ACTIVE,
        "gallery_images": [
            "/images/destinations/gondar-fasilides-castle-unesco.jpg",
            "/images/destinations/gondar-fasil-ghebbi-arch.jpg"
        ],
        "itinerary": [
            {
                "day": 1,
                "title": "Arrival & Fasil Ghebbi Royal Enclosure",
                "activities": "Arrive in Gondar, hotel check-in. Guided exploration through the stone palaces and castles of Emperor Fasilides, Iyasu I, and Empress Mentewab."
            },
            {
                "day": 2,
                "title": "Debre Berhan Selassie & Fasilides Bath",
                "activities": "Morning visit to the magnificent church of Debre Berhan Selassie with its famous winged cherub ceiling. Afternoon visit to the historic sunken Fasilides Bath surrounded by ancient banyan roots."
            },
            {
                "day": 3,
                "title": "Kuskuam Complex & Departure",
                "activities": "Tour the royal palace ruins of Empress Mentewab at Kuskuam on the hills overlooking Gondar. Traditional tej house visit and airport transfer."
            }
        ],
        "inclusions": [
            "4-star hotel accommodation with breakfast",
            "All palace and church admission permits",
            "Accredited English-speaking historical guide",
            "Private AC minivan transportation"
        ],
        "exclusions": [
            "International & domestic airfare",
            "Personal souvenir expenses"
        ]
    },
    {
        "title": "Addis Ababa: Diplomatic Capital & Cultural Discovery",
        "slug": "addis-ababa-diplomatic-cultural-tour",
        "region": "Addis Ababa",
        "short_description": "Discover Ethiopia's dynamic capital: ancestral home of Lucy, panoramic Entoto mountain, modern museums, and lively culture.",
        "description": "Addis Ababa is the vibrant political and diplomatic heart of Africa, hosting the African Union headquarters and United Nations ECA. Journey through the National Museum to meet 3.2-million-year-old \"Lucy\" (Dinknesh), ascend Entoto Park for pine-scented panoramas of the metropolis, visit the futuristic Ethiopia Science Museum, Friendship Park, and navigate Mercato, the largest open-air market on the African continent.",
        "base_price": 11500,
        "duration_days": 2,
        "capacity": 30,
        "popularity_score": 91,
        status: DestinationStatus.ACTIVE,
        "gallery_images": [
            "/images/destinations/addis-ababa-science-museum-skyline.jpg",
            "/images/destinations/addis-ababa-night-cbe-tower.jpg",
            "/images/destinations/addis-ababa-africa-map-monument.jpg"
        ],
        "itinerary": [
            {
                "day": 1,
                "title": "Lucy, Science Museum & Friendship Park",
                "activities": "Morning visit to the National Museum of Ethiopia to view Lucy (Dinknesh). Tour the modern Ethiopia Science Museum, Friendship Park, and the iconic CBE Tower skyline."
            },
            {
                "day": 2,
                "title": "Entoto Panoramic Mountain & Mercato",
                "activities": "Scenic ascent to Entoto Park for breathtaking city vistas and eucalyptus trails. Afternoon guided cultural walk through Mercato spice markets and traditional coffee tasting."
            }
        ],
        "inclusions": [
            "Private city van with driver",
            "National Museum & Science Museum entry",
            "Professional city guide",
            "Authentic Ethiopian dinner with live folkloric dance show"
        ],
        "exclusions": [
            "Personal purchases",
            "Alcoholic drinks"
        ]
    },
    {
        "title": "Lake Hawassa & Great Rift Valley Pelican Safari",
        "slug": "lake-hawassa-rift-valley-pelicans",
        "region": "Sidama",
        "short_description": "Morning boat safaris encountering thousands of white pelicans, Lake Hawassa fish market, and Sidama coffee farm trails.",
        "description": "Located in the scenic Sidama Region along the Great Rift Valley, Hawassa is famous for its serene freshwater lake and thriving birdlife. Experience sunrise boat rides surrounded by huge flocks of Great White Pelicans, storks, and fish eagles. Visit the lively morning fish market where local fishermen grill fresh Nile tilapia, wander the forested shores alive with Colobus monkeys, and taste world-famous organic Sidama single-origin coffee right from the source.",
        "base_price": 14500,
        "duration_days": 2,
        "capacity": 20,
        "popularity_score": 87,
        status: DestinationStatus.ACTIVE,
        "gallery_images": [
            "/images/destinations/lake-hawassa-pelicans-rift-valley.jpg",
            "/images/destinations/ethiopian-highlands-green.jpg"
        ],
        "itinerary": [
            {
                "day": 1,
                "title": "Lake Hawassa Boat Cruise & Fish Market",
                "activities": "Depart for Hawassa. Private motorboat cruise observing thousands of Great White Pelicans and hippos. Walk the shores to see black-and-white Colobus monkeys."
            },
            {
                "day": 2,
                "title": "Sidama Specialty Coffee Plantation & Return",
                "activities": "Guided tour of an organic Sidama coffee farm, participating in the traditional harvest and roasting ceremony. Scenic return drive along the Rift Valley lakes."
            }
        ],
        "inclusions": [
            "Lakeside resort lodging",
            "Private boat safari fees",
            "Sidama coffee farm tasting tour",
            "Local naturalist guide"
        ],
        "exclusions": [
            "Personal gear",
            "Tips"
        ]
    },
    {
        "title": "Wolaita: The Land of 50 Kings & Ajora Waterfalls",
        "slug": "wolaita-land-of-50-kings-ajora",
        "region": "South Ethiopia",
        "short_description": "Journey into the Land of 50 Kings: Mount Damota hiking, King Tona historical defenses, and majestic twin Ajora waterfalls.",
        "description": "Wolaita is a realm of lush emerald volcanic hills and profound royal heritage, historically ruled by the formidable Dynasty of 50 Kings. Stand before Mount Damota, explore the massive 19th-century defensive moats constructed by King Tona, hike to the thunderous twin Ajora Waterfalls cascading over 100 meters into deep gorges, and experience the warm hospitality, traditional bamboo architecture, and unique polyphonic music of the Wolaita people.",
        "base_price": 16800,
        "duration_days": 3,
        "capacity": 18,
        "popularity_score": 89,
        status: DestinationStatus.ACTIVE,
        "gallery_images": [
            "/images/destinations/wolaita-land-of-50-kings.jpg",
            "/images/destinations/ethiopian-highlands-green.jpg"
        ],
        "itinerary": [
            {
                "day": 1,
                "title": "Arrival in Sodo & Mount Damota Panorama",
                "activities": "Arrive in Wolaita Sodo. Afternoon hike up Mount Damota (2,900m) enjoying panoramic vistas across the southern rift valleys."
            },
            {
                "day": 2,
                "title": "Ajora Twin Waterfalls & King Tona Heritage",
                "activities": "Excursion to the breathtaking Ajora twin waterfalls plunging through deep green forested cliffs. Visit the King Tona defensive moats and traditional Wolaita palace grounds."
            },
            {
                "day": 3,
                "title": "Cultural Homesteads & Departure",
                "activities": "Morning visit to local artisan bamboo weavers and potteries. Traditional Wolaita banquet with \"Kotta\" and \"Kachano\" before departure."
            }
        ],
        "inclusions": [
            "4WD transportation",
            "All waterfall & heritage site permits",
            "Local Wolaita cultural guide",
            "Lodge accommodation with breakfast"
        ],
        "exclusions": [
            "Snacks and beverages",
            "Personal tipping"
        ]
    },
    {
        "title": "Bale Mountains: Afro-Alpine Wilderness & Red Fox Safari",
        "slug": "bale-mountains-afro-alpine-trek",
        "region": "Oromia",
        "short_description": "Trek Africa's highest plateau across Sanetti, home to the rare Ethiopian Wolf, and hike ancient Harenna cloud forests.",
        "description": "Bale Mountains National Park encompasses the largest area of afro-alpine habitat on the African continent. Across the stark 4,000-meter Sanetti Plateau, watch the endangered Ethiopian wolf stalking giant mole-rats among giant lobelia plants. Descend into the dense tropical Harenna forest shrouded in mist, rich in endemic bird species, wild forest coffee, and wild lions.",
        "base_price": 26500,
        "duration_days": 4,
        "capacity": 16,
        "popularity_score": 90,
        status: DestinationStatus.ACTIVE,
        "gallery_images": [
            "https://images.unsplash.com/photo-1516426122078-c23e76319801?auto=format&fit=crop&w=1200&q=80",
            "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=1200&q=80"
        ],
        "itinerary": [
            {
                "day": 1,
                "title": "Goba & Dinsho HQ",
                "activities": "Arrive at Dinsho headquarters. Woodland walk spotting Mountain Nyala and Menelik's Bushbuck."
            },
            {
                "day": 2,
                "title": "Sanetti Plateau & Mount Tullu Dimtu",
                "activities": "Drive across Sanetti Plateau (highest all-weather road in Africa). Summit Mount Tullu Dimtu (4,377m) and track Ethiopian wolf packs."
            },
            {
                "day": 3,
                "title": "Harenna Forest & Bamboo Waterfalls",
                "activities": "Descend the dramatic Harenna escarpment into lush mist forest. Hike along bamboo waterfalls and visit wild coffee collectors."
            },
            {
                "day": 4,
                "title": "Return via Rift Valley",
                "activities": "Scenic return journey with birdwatching stops at Lake Ziway."
            }
        ],
        "inclusions": [
            "Park scout & wildlife tracker",
            "4x4 mountain transportation",
            "Comfortable lodge accommodation",
            "All park conservation fees"
        ],
        "exclusions": [
            "Personal hiking gear",
            "Tips for trackers"
        ]
    },
    {
        "title": "Harar Jugol: The Historic 4th Holy City & Hyena Feeding",
        "slug": "harar-jugol-walled-city-safari",
        "region": "Harari",
        "short_description": "UNESCO 10th-century walled city of 99 mosques, labyrinthine colorful alleys, and the nightly wild hyena feeding ritual.",
        "description": "Considered the fourth holiest city of Islam, Harar Jugol is enclosed by a massive 16th-century rampart with five historic gates. Wander through 368 narrow alleys lined with traditional Harari guest houses, explore vibrant spice souks, visit the French poet Arthur Rimbaud mansion, and witness the thrilling nightly spectacle of the 'Hyena Men' hand-feeding wild spotted hyenas outside the city walls.",
        "base_price": 22000,
        "duration_days": 3,
        "capacity": 18,
        "popularity_score": 93,
        status: DestinationStatus.ACTIVE,
        "gallery_images": [
            "https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?auto=format&fit=crop&w=1200&q=80",
            "https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=1200&q=80"
        ],
        "itinerary": [
            {
                "day": 1,
                "title": "Harar Walled City Gates & Rimbaud House",
                "activities": "Arrive via Dire Dawa. Enter the fortified city gates, visit the Arthur Rimbaud Cultural Center and Ras Mekonnen palace."
            },
            {
                "day": 2,
                "title": "Harari Traditional Houses & Night Hyena Feeding",
                "activities": "Tour vibrant textile and spice markets. In the evening, witness the legendary Harar Hyena Man calling and feeding wild hyenas by mouth."
            },
            {
                "day": 3,
                "title": "Coffee Mills & Return",
                "activities": "Explore the historic Harari coffee processing and chat markets before departure transfer to Dire Dawa airport."
            }
        ],
        "inclusions": [
            "Traditional Harari heritage guest house",
            "Licensed Harari historian guide",
            "Hyena feeding event admission",
            "Airport transfers from Dire Dawa"
        ],
        "exclusions": [
            "Direct camera tipping fees",
            "Alcohol"
        ]
    },
    {
        "title": "Tigray: Gheralta Rock Churches & Ancient Axum",
        "slug": "tigray-gheralta-churches-axum",
        "region": "Tigray",
        "short_description": "Ascend sandstone pinnacles to cliffside cave churches in Gheralta and discover Axum's ancient monolithic stelae.",
        "description": "The Gheralta mountains rise like giant rust-red cathedrals from the Tigray plateau. Scale the breathtaking sandstone face to Abuna Yemata Guh, carved high inside a cliff pinnacle with ancient frescoes. Continue to holy Axum, cradle of Ethiopian civilization, to stand before towering 1,700-year-old granite obelisks and the revered Church of St. Mary of Zion, ancient home of the Ark of the Covenant.",
        "base_price": 29000,
        "duration_days": 4,
        "capacity": 15,
        "popularity_score": 92,
        status: DestinationStatus.ACTIVE,
        "gallery_images": [
            "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80",
            "https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=1200&q=80"
        ],
        "itinerary": [
            {
                "day": 1,
                "title": "Arrival & Gheralta Escarpment",
                "activities": "Fly to Mekele, transfer to Hawzen beneath the red cliffs of Gheralta. Sunset photography over the plateau."
            },
            {
                "day": 2,
                "title": "Abuna Yemata Guh & Mariam Korkor",
                "activities": "Morning guided climb with safety harnesses to the iconic cliff-ledge church of Abuna Yemata Guh. Afternoon hike to Mariam Korkor."
            },
            {
                "day": 3,
                "title": "Yeha Temple & Sacred Axum",
                "activities": "Drive via the 2,500-year-old pre-Christian temple of Yeha to Axum. Visit the UNESCO Northern Stelae Field."
            },
            {
                "day": 4,
                "title": "Ark of Zion & Queen of Sheba Bath",
                "activities": "Morning tour of St. Mary of Zion Chapel of the Tablet and the Queen of Sheba reservoir (Mai Shum). Airport transfer."
            }
        ],
        "inclusions": [
            "Mountain climbing guides & local church scouts",
            "4WD transportation",
            "3 nights hotel & mountain lodge lodging",
            "All historical church and UNESCO permits"
        ],
        "exclusions": [
            "Personal climbing footwear",
            "Tipping"
        ]
    }
];

  const destinationEntities: Record<string, Destination> = {};
  for (const d of destinationsData) {
    let dest = await dataSource.getRepository(Destination).findOne({ where: { slug: d.slug } });
    if (!dest) {
      dest = await dataSource.getRepository(Destination).save(
        dataSource.getRepository(Destination).create({
          ...d,
          created_by: owner.id,
        }),
      );
      console.log(`Created destination: ${d.title}`);
    } else {
      dest.gallery_images = d.gallery_images;
      dest.title = d.title;
      dest.region = d.region;
      dest.short_description = d.short_description;
      dest.description = d.description;
      dest.itinerary = d.itinerary;
      dest.inclusions = d.inclusions;
      dest.exclusions = d.exclusions;
      dest.base_price = d.base_price;
      dest.duration_days = d.duration_days;
      dest.capacity = d.capacity;
      dest.popularity_score = d.popularity_score;
      dest.status = d.status;
      dest = await dataSource.getRepository(Destination).save(dest);
      console.log(`Updated destination: ${d.title}`);
    }
    destinationEntities[d.slug] = dest;
  }
  console.log('Destinations seeded.');

  // 5. Seasonal Pricing Rules
  const lalibela = destinationEntities['lalibela-rock-hewn-churches'];
  if (lalibela) {
    const existingRule = await dataSource.getRepository(PriceRule).findOne({
      where: { destination_id: lalibela.id },
    });
    if (!existingRule) {
      await dataSource.getRepository(PriceRule).save([
        dataSource.getRepository(PriceRule).create({
          destination_id: lalibela.id,
          name: 'Genna (Ethiopian Christmas) Peak Season',
          start_date: '2026-12-20',
          end_date: '2027-01-15',
          adjust_type: PriceAdjustType.PERCENT,
          value: 15.0, // +15%
          priority: 5,
        }),
        dataSource.getRepository(PriceRule).create({
          destination_id: lalibela.id,
          name: 'Rainy Season Special Discount',
          start_date: '2026-07-01',
          end_date: '2026-08-31',
          adjust_type: PriceAdjustType.PERCENT,
          value: -10.0, // -10%
          priority: 2,
        }),
      ]);
    }
  }

  // 6. Sample Bookings & Transactions
  const existingBookings = await dataSource.getRepository(Booking).count();
  if (existingBookings === 0 && lalibela && clientUser) {
    // Approved booking with commission
    const approvedBooking = await dataSource.getRepository(Booking).save(
      dataSource.getRepository(Booking).create({
        client_id: clientUser.id,
        destination_id: lalibela.id,
        agent_id: agentProfile.id,
        travel_date: '2026-11-15',
        travelers: 2,
        unit_price: 18500.0,
        total_price: 37000.0,
        status: BookingStatus.APPROVED,
        approved_by: manager.id,
        approved_at: new Date(),
        manager_comment: 'Confirmed with private English guide.',
        client_notes: 'Dietary preference: vegetarian.',
      }),
    );

    await dataSource.getRepository(BookingStatusHistory).save([
      {
        booking_id: approvedBooking.id,
        from_status: null,
        to_status: BookingStatus.PENDING,
        actor_id: clientUser.id,
        comment: 'Booking submitted online',
      },
      {
        booking_id: approvedBooking.id,
        from_status: BookingStatus.PENDING,
        to_status: BookingStatus.APPROVED,
        actor_id: manager.id,
        comment: 'Confirmed with private English guide.',
      },
    ]);

    // 10% commission = 3,700 ETB
    await dataSource.getRepository(WalletTransaction).save(
      dataSource.getRepository(WalletTransaction).create({
        agent_id: agentProfile.id,
        booking_id: approvedBooking.id,
        type: WalletTxType.COMMISSION_CREDIT,
        amount: 3700.0,
        rate_used: 0.1,
        balance_after: 3850.0,
        reference: `Commission for booking #${approvedBooking.id.substring(0, 8)}`,
        created_by: manager.id,
      }),
    );

    // Pending booking
    const simien = destinationEntities['simien-mountains-trek'];
    if (simien) {
      const pendingBooking = await dataSource.getRepository(Booking).save(
        dataSource.getRepository(Booking).create({
          client_id: clientUser.id,
          destination_id: simien.id,
          agent_id: agentProfile.id,
          travel_date: '2026-12-05',
          travelers: 1,
          unit_price: 24000.0,
          total_price: 24000.0,
          status: BookingStatus.PENDING,
          client_notes: 'Need tent and warm sleeping bag provided.',
        }),
      );

      await dataSource.getRepository(BookingStatusHistory).save({
        booking_id: pendingBooking.id,
        from_status: null,
        to_status: BookingStatus.PENDING,
        actor_id: clientUser.id,
        comment: 'Booking request awaiting manager moderation',
      });
    }

    // Notifications
    await dataSource.getRepository(Notification).save([
      {
        user_id: clientUser.id,
        type: 'BOOKING_APPROVED',
        title: 'Booking Approved!',
        body: 'Your booking for Lalibela Rock-Hewn Churches has been approved.',
        ref_type: 'Booking',
        ref_id: approvedBooking.id,
      },
      {
        user_id: agentUser.id,
        type: 'COMMISSION_CREDITED',
        title: 'Commission Credited',
        body: '+3,700.00 ETB commission credited for approved client booking.',
        ref_type: 'Booking',
        ref_id: approvedBooking.id,
      },
      {
        user_id: manager.id,
        type: 'BOOKING_CREATED',
        title: 'New Booking Request',
        body: 'New booking request submitted for Simien Mountains Trek.',
        ref_type: 'Booking',
      },
    ]);

    // Sample Chat Conversation
    const conv = await dataSource.getRepository(Conversation).save(
      dataSource.getRepository(Conversation).create({
        type: ConversationType.AGENT_MANAGER,
        participant_ids: [agentUser.id, manager.id],
        status: 'ACTIVE',
      }),
    );

    await dataSource.getRepository(Message).save([
      {
        conversation_id: conv.id,
        sender_id: agentUser.id,
        body: 'Hello Manager, client Hanna Girma just booked Lalibela for next month. Can we arrange the best guide in town?',
      },
      {
        conversation_id: conv.id,
        sender_id: manager.id,
        body: 'Hi Dawit! Absolutely, I have assigned our senior historical guide Kassahun. The booking has been approved and your 10% commission is credited.',
      },
    ]);
  }

  // App Settings (default commission & penalty rates)
  const commSetting = await dataSource.getRepository(AppSetting).findOne({
    where: { key: 'commission_rate' },
  });
  if (!commSetting) {
    await dataSource.getRepository(AppSetting).save({
      key: 'commission_rate',
      value: { default_rate: 0.1, currency: 'ETB' },
      updated_by: owner.id,
    });
  }
  const penaltySetting = await dataSource.getRepository(AppSetting).findOne({
    where: { key: 'cancellation_penalty_rate' },
  });
  if (!penaltySetting) {
    await dataSource.getRepository(AppSetting).save({
      key: 'cancellation_penalty_rate',
      value: { default_rate: 0.02, refund_rate: 0.98 },
      updated_by: owner.id,
    });
  }

  console.log('=======================================================');
  console.log('DATABASE SEEDING COMPLETED SUCCESSFULLY!');
  console.log('Login credentials:');
  console.log('  Owner:   owner@askdigital.et   / Owner@2026!');
  console.log('  Manager: manager@askdigital.et / Manager@2026!');
  console.log('  Agent:   agent@askdigital.et   / Agent@2026! (Ref: ETHIOPIA10)');
  console.log('  Client:  client@gmail.com      / Client@2026!');
  console.log('=======================================================');

  await dataSource.destroy();
}

seed().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
