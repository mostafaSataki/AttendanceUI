import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database with sample data...');

  // Hash passwords
  const hashPassword = async (password: string) => {
    return await bcrypt.hash(password, 12);
  };

  try {
    // Clean up existing data (optional - comment out if you want to keep existing data)
    console.log('🧹 Cleaning up existing data...');
    await prisma.attendanceLog.deleteMany();
    await prisma.dailySummary.deleteMany();
    await prisma.leaveRequest.deleteMany();
    await prisma.missionRequest.deleteMany();
    await prisma.personnel.deleteMany();
    await prisma.user.deleteMany();
    await prisma.workGroupShiftAssignment.deleteMany();
    await prisma.workGroup.deleteMany();
    await prisma.shift.deleteMany();
    await prisma.holiday.deleteMany();
    await prisma.calendar.deleteMany();
    await prisma.missionType.deleteMany();
    await prisma.leaveType.deleteMany();
    await prisma.orgUnit.deleteMany();

    // Create Users
    console.log('👥 Creating users...');
    const users = await Promise.all([
      prisma.user.create({
        data: {
          username: 'admin',
          email: 'admin@company.com',
          password: await hashPassword('admin123'),
          fullName: 'مدیر سیستم',
          role: 'ADMIN',
        },
      }),
      prisma.user.create({
        data: {
          username: 'manager1',
          email: 'manager1@company.com',
          password: await hashPassword('manager123'),
          fullName: 'مدیر منابع انسانی',
          role: 'MANAGER',
        },
      }),
      prisma.user.create({
        data: {
          username: 'manager2',
          email: 'manager2@company.com',
          password: await hashPassword('manager123'),
          fullName: 'مدیر مالی',
          role: 'MANAGER',
        },
      }),
      prisma.user.create({
        data: {
          username: 'user1',
          email: 'user1@company.com',
          password: await hashPassword('user123'),
          fullName: 'علی رضایی',
          role: 'USER',
        },
      }),
      prisma.user.create({
        data: {
          username: 'user2',
          email: 'user2@company.com',
          password: await hashPassword('user123'),
          fullName: 'سارا محمدی',
          role: 'USER',
        },
      }),
      prisma.user.create({
        data: {
          username: 'user3',
          email: 'user3@company.com',
          password: await hashPassword('user123'),
          fullName: 'رضا قاسمی',
          role: 'USER',
        },
      }),
      prisma.user.create({
        data: {
          username: 'user4',
          email: 'user4@company.com',
          password: await hashPassword('user123'),
          fullName: 'مریم احمدی',
          role: 'USER',
        },
      }),
      prisma.user.create({
        data: {
          username: 'user5',
          email: 'user5@company.com',
          password: await hashPassword('user123'),
          fullName: 'محمد تقوی',
          role: 'USER',
        },
      }),
    ]);

    // Create Organization Units
    console.log('🏢 Creating organization units...');
    const mainOrgUnit = await prisma.orgUnit.create({
      data: {
        name: 'شرکت اصلی',
        description: 'دفتر مرکزی شرکت',
      },
    });
    
    const hrOrgUnit = await prisma.orgUnit.create({
      data: {
        name: 'واحد منابع انسانی',
        description: 'دپارتمان منابع انسانی',
        parentId: mainOrgUnit.id,
      },
    });
    
    const financeOrgUnit = await prisma.orgUnit.create({
      data: {
        name: 'واحد مالی',
        description: 'دپارتمان مالی و حسابداری',
        parentId: mainOrgUnit.id,
      },
    });
    
    const technicalOrgUnit = await prisma.orgUnit.create({
      data: {
        name: 'واحد فنی',
        description: 'دپارتمان فنی و مهندسی',
        parentId: mainOrgUnit.id,
      },
    });

    // Create Shifts
    console.log('⏰ Creating shifts...');
    const shifts = await Promise.all([
      prisma.shift.create({
        data: {
          name: 'شیفت صبح',
          startTime: '08:00',
          endTime: '16:00',
          gracePeriod: 15,
          description: 'شیفت کاری صبح از ۸ صبح تا ۴ بعدازظهر',
        },
      }),
      prisma.shift.create({
        data: {
          name: 'شیفت عصر',
          startTime: '16:00',
          endTime: '00:00',
          gracePeriod: 15,
          isNightShift: true,
          description: 'شیفت کاری عصر از ۴ بعدازظهر تا ۱۲ شب',
        },
      }),
      prisma.shift.create({
        data: {
          name: 'شیفت شب',
          startTime: '00:00',
          endTime: '08:00',
          gracePeriod: 15,
          isNightShift: true,
          description: 'شیفت کاری شب از ۱۲ شب تا ۸ صبح',
        },
      }),
    ]);

    // Create Leave Types
    console.log('📝 Creating leave types...');
    const leaveTypes = await Promise.all([
      prisma.leaveType.create({
        data: {
          name: 'مرخصی استحقاقی',
          description: 'مرخصی سالانه با حقوق',
          maxDays: 26,
          isPaid: true,
        },
      }),
      prisma.leaveType.create({
        data: {
          name: 'مرخصی استعلاجی',
          description: 'مرخصی بیماری با حقوق',
          requiresDocument: true,
          isPaid: true,
        },
      }),
      prisma.leaveType.create({
        data: {
          name: 'مرخصی بدون حقوق',
          description: 'مرخصی بدون دریافت حقوق',
          isPaid: false,
        },
      }),
    ]);

    // Create Mission Types
    console.log('✈️ Creating mission types...');
    const missionTypes = await Promise.all([
      prisma.missionType.create({
        data: {
          name: 'مأموریت کاری',
          description: 'مأموریت رسمی کاری',
        },
      }),
      prisma.missionType.create({
        data: {
          name: 'مأموریت آموزشی',
          description: 'مأموریت برای دوره‌های آموزشی',
          requiresDocument: true,
        },
      }),
    ]);

    // Create Calendar
    console.log('📅 Creating calendar...');
    const calendar = await prisma.calendar.create({
      data: {
        name: 'تقویم کاری ۱۴۰۳',
        year: 1403,
        description: 'تقویم کاری شرکت برای سال ۱۴۰۳',
      },
    });

    // Create Personnel
    console.log('👷 Creating personnel...');
    const adminUser = users.find(u => u.username === 'admin')!;
    const manager1User = users.find(u => u.username === 'manager1')!;
    const manager2User = users.find(u => u.username === 'manager2')!;

    const morningShift = shifts.find(s => s.name === 'شیفت صبح')!;
    const eveningShift = shifts.find(s => s.name === 'شیفت عصر')!;

    const personnel = await Promise.all([
      // Manager personnel
      prisma.personnel.create({
        data: {
          personnelNumber: 'EMP001',
          cardNumber: 'CARD001',
          fullName: 'مدیر سیستم',
          email: 'admin@company.com',
          position: 'مدیر عامل',
          department: 'مدیریت',
          orgUnitId: hrOrgUnit.id,
          shiftId: morningShift.id,
          userId: adminUser.id,
          hireDate: new Date('2020-01-01'),
        },
      }),
      prisma.personnel.create({
        data: {
          personnelNumber: 'EMP002',
          cardNumber: 'CARD002',
          fullName: 'مدیر منابع انسانی',
          email: 'manager1@company.com',
          position: 'مدیر منابع انسانی',
          department: 'منابع انسانی',
          orgUnitId: hrOrgUnit.id,
          shiftId: morningShift.id,
          userId: manager1User.id,
          hireDate: new Date('2019-03-15'),
        },
      }),
      prisma.personnel.create({
        data: {
          personnelNumber: 'EMP003',
          cardNumber: 'CARD003',
          fullName: 'مدیر مالی',
          email: 'manager2@company.com',
          position: 'مدیر مالی',
          department: 'مالی',
          orgUnitId: financeOrgUnit.id,
          shiftId: morningShift.id,
          userId: manager2User.id,
          hireDate: new Date('2018-07-20'),
        },
      }),

      // Regular personnel
      prisma.personnel.create({
        data: {
          personnelNumber: 'EMP004',
          cardNumber: 'CARD004',
          fullName: 'علی رضایی',
          email: 'user1@company.com',
          phone: '09123456789',
          position: 'برنامه‌نویس ارشد',
          department: 'فنی',
          orgUnitId: technicalOrgUnit.id,
          shiftId: morningShift.id,
          userId: users.find(u => u.username === 'user1')!.id,
          hireDate: new Date('2021-02-10'),
        },
      }),
      prisma.personnel.create({
        data: {
          personnelNumber: 'EMP005',
          cardNumber: 'CARD005',
          fullName: 'سارا محمدی',
          email: 'user2@company.com',
          phone: '09123456790',
          position: 'تحلیلگر سیستم',
          department: 'فنی',
          orgUnitId: technicalOrgUnit.id,
          shiftId: morningShift.id,
          userId: users.find(u => u.username === 'user2')!.id,
          hireDate: new Date('2021-05-15'),
        },
      }),
      prisma.personnel.create({
        data: {
          personnelNumber: 'EMP006',
          cardNumber: 'CARD006',
          fullName: 'رضا قاسمی',
          email: 'user3@company.com',
          phone: '09123456791',
          position: 'کارشناس مالی',
          department: 'مالی',
          orgUnitId: financeOrgUnit.id,
          shiftId: morningShift.id,
          userId: users.find(u => u.username === 'user3')!.id,
          hireDate: new Date('2020-08-20'),
        },
      }),
      prisma.personnel.create({
        data: {
          personnelNumber: 'EMP007',
          cardNumber: 'CARD007',
          fullName: 'مریم احمدی',
          email: 'user4@company.com',
          phone: '09123456792',
          position: 'کارشناس منابع انسانی',
          department: 'منابع انسانی',
          orgUnitId: hrOrgUnit.id,
          shiftId: eveningShift.id,
          userId: users.find(u => u.username === 'user4')!.id,
          hireDate: new Date('2022-01-10'),
        },
      }),
      prisma.personnel.create({
        data: {
          personnelNumber: 'EMP008',
          cardNumber: 'CARD008',
          fullName: 'محمد تقوی',
          email: 'user5@company.com',
          phone: '09123456793',
          position: 'توسعه‌دهنده وب',
          department: 'فنی',
          orgUnitId: technicalOrgUnit.id,
          shiftId: eveningShift.id,
          userId: users.find(u => u.username === 'user5')!.id,
          hireDate: new Date('2022-03-05'),
        },
      }),
    ]);

    // Create some sample attendance logs
    console.log('🕐 Creating sample attendance logs...');
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const sampleLogs = [
      // Ali Rezaei - Today
      {
        personnelId: personnel.find(p => p.fullName === 'علی رضایی')!.id,
        logTime: new Date(`${today.toISOString().split('T')[0]}T08:05:00`),
        logType: 'IN' as const,
      },
      {
        personnelId: personnel.find(p => p.fullName === 'علی رضایی')!.id,
        logTime: new Date(`${today.toISOString().split('T')[0]}T12:30:00`),
        logType: 'BREAK_OUT' as const,
      },
      {
        personnelId: personnel.find(p => p.fullName === 'علی رضایی')!.id,
        logTime: new Date(`${today.toISOString().split('T')[0]}T13:30:00`),
        logType: 'BREAK_IN' as const,
      },
      {
        personnelId: personnel.find(p => p.fullName === 'علی رضایی')!.id,
        logTime: new Date(`${today.toISOString().split('T')[0]}T16:10:00`),
        logType: 'OUT' as const,
      },

      // Sara Mohammadi - Today
      {
        personnelId: personnel.find(p => p.fullName === 'سارا محمدی')!.id,
        logTime: new Date(`${today.toISOString().split('T')[0]}T08:15:00`),
        logType: 'IN' as const,
      },
      {
        personnelId: personnel.find(p => p.fullName === 'سارا محمدی')!.id,
        logTime: new Date(`${today.toISOString().split('T')[0]}T16:05:00`),
        logType: 'OUT' as const,
      },

      // Reza Ghasemi - Yesterday
      {
        personnelId: personnel.find(p => p.fullName === 'رضا قاسمی')!.id,
        logTime: new Date(`${yesterday.toISOString().split('T')[0]}T08:00:00`),
        logType: 'IN' as const,
      },
      {
        personnelId: personnel.find(p => p.fullName === 'رضا قاسمی')!.id,
        logTime: new Date(`${yesterday.toISOString().split('T')[0]}T16:00:00`),
        logType: 'OUT' as const,
      },
    ];

    await prisma.attendanceLog.createMany({
      data: sampleLogs,
    });

    // Create sample leave requests
    console.log('📋 Creating sample leave requests...');
    const annualLeave = leaveTypes.find(lt => lt.name === 'مرخصی استحقاقی')!;
    const sickLeave = leaveTypes.find(lt => lt.name === 'مرخصی استعلاجی')!;

    const leaveStartDate = new Date();
    leaveStartDate.setDate(leaveStartDate.getDate() + 3);
    const leaveEndDate = new Date(leaveStartDate);
    leaveEndDate.setDate(leaveEndDate.getDate() + 2);

    await Promise.all([
      prisma.leaveRequest.create({
        data: {
          personnelId: personnel.find(p => p.fullName === 'مریم احمدی')!.id,
          leaveTypeId: annualLeave.id,
          startDate: leaveStartDate.toISOString().split('T')[0],
          endDate: leaveEndDate.toISOString().split('T')[0],
          isHourly: false,
          description: 'مرخصی برای استراحت و تفریح',
          status: 'PENDING',
        },
      }),
      prisma.leaveRequest.create({
        data: {
          personnelId: personnel.find(p => p.fullName === 'محمد تقوی')!.id,
          leaveTypeId: sickLeave.id,
          startDate: yesterday.toISOString().split('T')[0],
          endDate: yesterday.toISOString().split('T')[0],
          isHourly: true,
          startTime: '10:00',
          endTime: '14:00',
          description: 'مراجعه به پزشک',
          status: 'APPROVED',
          approverName: 'مدیر منابع انسانی',
        },
      }),
    ]);

    // Create sample mission requests
    console.log('🎯 Creating sample mission requests...');
    const workMission = missionTypes.find(mt => mt.name === 'مأموریت کاری')!;
    const trainingMission = missionTypes.find(mt => mt.name === 'مأموریت آموزشی')!;

    const missionStartDate = new Date();
    missionStartDate.setDate(missionStartDate.getDate() + 5);
    const missionEndDate = new Date(missionStartDate);
    missionEndDate.setDate(missionEndDate.getDate() + 1);

    await Promise.all([
      prisma.missionRequest.create({
        data: {
          personnelId: personnel.find(p => p.fullName === 'علی رضایی')!.id,
          missionTypeId: workMission.id,
          startDate: missionStartDate.toISOString().split('T')[0],
          endDate: missionEndDate.toISOString().split('T')[0],
          isHourly: false,
          destination: 'مشهد',
          description: 'مأموریت نصب و راه‌اندازی سیستم در مشهد',
          estimatedCost: 5000000,
          status: 'PENDING',
        },
      }),
      prisma.missionRequest.create({
        data: {
          personnelId: personnel.find(p => p.fullName === 'سارا محمدی')!.id,
          missionTypeId: trainingMission.id,
          startDate: new Date().toISOString().split('T')[0],
          endDate: new Date().toISOString().split('T')[0],
          isHourly: true,
          startTime: '09:00',
          endTime: '17:00',
          destination: 'تهران',
          description: 'دوره آموزشی پیشرفته برنامه‌نویسی',
          estimatedCost: 2000000,
          status: 'APPROVED',
          approverName: 'مدیر فنی',
        },
      }),
    ]);

    console.log('✅ Database seeded successfully!');
    console.log('\n🔑 Sample Login Credentials:');
    console.log('═════════════════════════════════════════');
    console.log('👤 ADMIN LEVEL:');
    console.log('   Username: admin');
    console.log('   Password: admin123');
    console.log('   Name: مدیر سیستم');
    console.log('');
    console.log('👤 MANAGER LEVEL:');
    console.log('   Username: manager1');
    console.log('   Password: manager123');
    console.log('   Name: مدیر منابع انسانی');
    console.log('');
    console.log('   Username: manager2');
    console.log('   Password: manager123');
    console.log('   Name: مدیر مالی');
    console.log('');
    console.log('👤 USER LEVEL:');
    console.log('   Username: user1');
    console.log('   Password: user123');
    console.log('   Name: علی رضایی (برنامه‌نویس ارشد)');
    console.log('');
    console.log('   Username: user2');
    console.log('   Password: user123');
    console.log('   Name: سارا محمدی (تحلیلگر سیستم)');
    console.log('');
    console.log('   Username: user3');
    console.log('   Password: user123');
    console.log('   Name: رضا قاسمی (کارشناس مالی)');
    console.log('');
    console.log('   Username: user4');
    console.log('   Password: user123');
    console.log('   Name: مریم احمدی (کارشناس منابع انسانی)');
    console.log('');
    console.log('   Username: user5');
    console.log('   Password: user123');
    console.log('   Name: محمد تقوی (توسعه‌دهنده وب)');
    console.log('═════════════════════════════════════════');

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });