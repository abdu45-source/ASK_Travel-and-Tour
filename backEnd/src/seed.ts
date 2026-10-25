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
      title: 'Lalibela Rock-Hewn Churches',
      slug: 'lalibela-rock-hewn-churches',
      region: 'Amhara',
      short_description: 'Explore the 12th-century UNESCO World Heritage monolithic churches carved out of red volcanic stone.',
      description: 'Lalibela is a holy town in northern Ethiopia, famed for its extraordinary rock-hewn monolithic churches dating from the 12th and 13th centuries under King Lalibela. Regarded as the "Eighth Wonder of the World", these 11 interconnected underground structures include the legendary cruciform Church of St. George (Bete Giyorgis). Experience sacred chants, incense-filled catacombs, and breathtaking mountain vistas.',
      base_price: 18500.0,
      duration_days: 3,
      capacity: 25,
      popularity_score: 95,
      status: DestinationStatus.ACTIVE,
      gallery_images: [
        'https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1516426122078-c23e76319801?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?auto=format&fit=crop&w=1200&q=80',
      ],
      itinerary: [
        { day: 1, title: 'Arrival & Northern Church Cluster', activities: 'Arrive at Lalibela Airport, transfer to hotel with mountain view. Afternoon guided tour of the Northern Group including Bete Medhane Alem and Bete Maryam.' },
        { day: 2, title: 'Eastern Group & Bete Giyorgis', activities: 'Explore the Eastern Cluster through underground tunnels. Sunset visit to the iconic Bete Giyorgis (Church of St. George).' },
        { day: 3, title: 'Yemrehana Krestos & Departure', activities: 'Morning excursion to the cave church of Yemrehana Krestos. Traditional coffee ceremony and airport transfer.' },
      ],
      inclusions: ['Domestic flight transfers', 'Licensed English-speaking historical guide', 'Church entry permits', '4-star hotel accommodation with breakfast', 'Private air-conditioned minivan'],
      exclusions: ['International flights', 'Alcoholic beverages', 'Personal souvenir purchases'],
    },
    {
      title: 'Simien Mountains Trek & Gelada Baboons',
      slug: 'simien-mountains-trek',
      region: 'Amhara',
      short_description: 'Highland trekking through dramatic escarpments, deep gorges, and encounters with endemic Gelada baboons.',
      description: 'The Simien Mountains National Park is a rugged plateau towering over 4,000 meters, known as the "Roof of Africa". Deep precipices drop sheer for 1,500 meters into valleys below. Home to extraordinary wildlife found nowhere else on Earth, including friendly herds of Gelada "bleeding heart" baboons, the majestic Walia ibex, and the elusive Ethiopian wolf.',
      base_price: 24000.0,
      duration_days: 4,
      capacity: 20,
      popularity_score: 88,
      status: DestinationStatus.ACTIVE,
      gallery_images: [
        'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80',
      ],
      itinerary: [
        { day: 1, title: 'Debark to Sankaber Camp', activities: 'Depart Gondar for Debark HQ. Scenic hike along escarpment edges to Sankaber camp with initial Gelada baboon encounters.' },
        { day: 2, title: 'Jinbar Waterfall & Geech Camp', activities: 'Trek across the dramatic 500m Jinbar Waterfall abyss towards Geech plateau across giant lobelia fields.' },
        { day: 3, title: 'Imet Gogo Pinnacle View', activities: 'Sunrise ascent to Imet Gogo (3,926m) for the most awe-inspiring 360-degree vista in Africa.' },
        { day: 4, title: 'Chennek & Return', activities: 'Scenic wildlife drive watching Walia ibex on sheer cliffs, scenic return drive to Gondar.' },
      ],
      inclusions: ['Park entrance fees & Scout accompaniment', 'Full camping gear & mountain cook', 'Meals during trek', '4x4 transport'],
      exclusions: ['Sleeping bag rental (optional)', 'Gratuities for scouts and porters'],
    },
    {
      title: 'Danakil Depression & Erta Ale Volcano',
      slug: 'danakil-depression-erta-ale',
      region: 'Afar',
      short_description: 'An otherworldly expedition to bubbling lava lakes, vivid sulfur springs, and glowing salt flats.',
      description: 'One of the lowest, hottest, and most geologically hyperactive places on the planet, the Danakil Depression sits 125 meters below sea level. Witness the surreal neon-yellow, green, and turquoise sulfur formations of Dallol, traverse vast blinding white salt pans worked by Afar camel caravans, and peer into the glowing bubbling molten lava lake of Erta Ale shield volcano under the desert stars.',
      base_price: 35000.0,
      duration_days: 4,
      capacity: 16,
      popularity_score: 92,
      status: DestinationStatus.ACTIVE,
      gallery_images: [
        'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=1200&q=80',
      ],
      itinerary: [
        { day: 1, title: 'Semera to Hamed Ela', activities: '4x4 expedition through the Afar desert rift to the salt-mining village of Hamed Ela.' },
        { day: 2, title: 'Dallol Hydrothermal Fields & Lake Assale', activities: 'Explore the extraterrestrial salt chimneys of Dallol and enjoy sunset swimming in the hypersaline Lake Assale.' },
        { day: 3, title: 'Ascent to Erta Ale Volcano', activities: 'Drive to Dodom base camp and twilight trek to the crater rim of active Erta Ale lava lake.' },
        { day: 4, title: 'Sunrise Crater & Return to Semera', activities: 'Sunrise photography at the caldera rim followed by return convoy to Semera airport.' },
      ],
      inclusions: ['4x4 Land Cruisers with AC', 'Armed Afar security escorts & guides', 'Camp gear and desert chef', 'Unlimited bottled mineral water'],
      exclusions: ['Alcoholic drinks', 'Personal medication'],
    },
    {
      title: 'Lake Tana Monasteries & Blue Nile Falls',
      slug: 'lake-tana-blue-nile-bahir-dar',
      region: 'Amhara',
      short_description: 'Boat cruises across Ethiopia’s largest lake, ancient island monasteries, and the thundering Blue Nile waterfall.',
      description: 'Bahir Dar, set on the southern palm-lined shores of Lake Tana, is the birthplace of the Blue Nile River. Board a private boat to discover medieval monasteries adorned with vibrant biblical murals and historical imperial crowns on lush islands. Later, journey to Tis Abay to witness the smoky thunder of the Blue Nile Falls.',
      base_price: 12000.0,
      duration_days: 2,
      capacity: 30,
      popularity_score: 80,
      status: DestinationStatus.ACTIVE,
      gallery_images: [
        'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1519046904884-53103b34b206?auto=format&fit=crop&w=1200&q=80',
      ],
      itinerary: [
        { day: 1, title: 'Lake Tana Boat Cruise', activities: 'Full-day motorboat cruise to Zege Peninsula to visit Ura Kidane Mehret and Azwa Maryam monasteries.' },
        { day: 2, title: 'Tis Abay (Blue Nile Falls)', activities: 'Scenic morning drive and suspension footbridge hike to the Blue Nile Falls. Afternoon stroll along Bahir Dar promenade.' },
      ],
      inclusions: ['Private boat charter', 'All monastery admission fees', 'Lakeside hotel accommodation', 'Professional guide'],
      exclusions: ['Tips and personal spending'],
    },
    {
      title: 'Omo Valley Cultural Expedition',
      slug: 'omo-valley-cultural-expedition',
      region: 'South Ethiopia',
      short_description: 'Immersive cultural journey visiting the Hamar, Mursi, and Karo tribal communities along the Great Rift Valley.',
      description: 'The Lower Omo Valley is a living anthropological crossroads preserving ancient traditions, body art, and ceremonies unchanged for generations. Meet the Mursi famed for their clay lip plates, attend a Hamar bull-jumping celebration and women’s Evangadi night dance, and admire the white-chalk body paintings of the Karo overlooking the sweeping Omo River.',
      base_price: 42000.0,
      duration_days: 6,
      capacity: 12,
      popularity_score: 85,
      status: DestinationStatus.ACTIVE,
      gallery_images: [
        'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=1200&q=80',
      ],
      itinerary: [
        { day: 1, title: 'Arba Minch & Dorze Villages', activities: 'Arrive in Arba Minch, visit high-altitude Dorze elephant-shaped bamboo huts and cotton weavers.' },
        { day: 2, title: 'Lake Chamo Crocodile Market & Konso', activities: 'Morning boat safari amongst giant Nile crocodiles, afternoon tour of UNESCO Konso stone-walled terraces.' },
        { day: 3, title: 'Hamar Settlements of Turmi', activities: 'Journey deeper south to Turmi; visit traditional Hamar homesteads and witness pottery and body scarification artistry.' },
        { day: 4, title: 'Karo at Korcho Pinnacle', activities: 'Excursion to Korcho village with panorama overlooking the Omo River, body painting cultural exchange.' },
        { day: 5, title: 'Mursi Tribe of Mago National Park', activities: 'Cross into Mago National Park to visit Mursi villages known for clay lip plates and acacia woodcraft.' },
        { day: 6, title: 'Key Afer Market & Jinka Flight', activities: 'Vibrant inter-tribal weekly market in Key Afer, transfer to Jinka airport for return flight.' },
      ],
      inclusions: ['Specialist cultural tribal guide', 'Village photography & entry permits', 'Full board accommodation in eco-lodges', 'Dedicated 4WD transportation'],
      exclusions: ['Direct tipping for photographed elders', 'Special event fees (bull jumping ceremony)'],
    },
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
