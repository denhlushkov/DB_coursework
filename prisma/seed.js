const { PrismaClient } = require('../src/generated/prisma');
const prisma = new PrismaClient();

async function main() {
  console.log(' Початок наповнення бази ');

  await prisma.payment.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.session.deleteMany();
  await prisma.therapist.deleteMany();
  await prisma.patient.deleteMany();
  await prisma.medicalRecord.deleteMany();
  await prisma.procedure.deleteMany();
  await prisma.diagnosis.deleteMany();
  await prisma.schedule.deleteMany();

  console.log('База очищена.');

  const diagnosesData = [
    { title: 'Грип А', severity_level: 'Medium', description: 'Сезонний вірус' },
    { title: 'Бронхіт', severity_level: 'Medium', description: 'Запалення дихальних шляхів' },
    { title: 'Перелом передпліччя', severity_level: 'High', description: 'Травма кістки' },
    { title: 'Гіпертонія', severity_level: 'High', description: 'Підвищений тиск' },
    { title: 'Отит', severity_level: 'Low', description: 'Запалення вуха' },
    { title: 'Ангіна', severity_level: 'Medium', description: 'Бактеріальна інфекція' },
    { title: 'Струс мозку', severity_level: 'Critical', description: 'Черепно-мозкова травма' },
    { title: 'Гастрит', severity_level: 'Medium', description: 'Запалення слизової шлунка' },
    { title: 'Алергічний риніт', severity_level: 'Low', description: 'Реакція на пилок' },
    { title: 'Цукровий діабет', severity_level: 'Critical', description: 'Порушення метаболізму' },
  ];
  
  const createdDiagnoses = [];
  for (const d of diagnosesData) {
    const diag = await prisma.diagnosis.create({ data: d });
    createdDiagnoses.push(diag);
  }

  const proceduresData = [
    { title: 'Загальний огляд', cost: 450.00, duration_minutes: 20 },
    { title: 'Консультація вузького спеціаліста', cost: 800.00, duration_minutes: 40 },
    { title: 'Рентген-дослідження', cost: 1200.00, duration_minutes: 30 },
    { title: 'Фізіотерапія', cost: 600.00, duration_minutes: 45 },
    { title: 'Хірургічна перев’язка', cost: 500.00, duration_minutes: 25 },
  ];
  const createdProcedures = [];
  for (const p of proceduresData) {
    const proc = await prisma.procedure.create({ data: p });
    createdProcedures.push(proc);
  }

  const createdSchedules = [];
  for (let i = 0; i < 15; i++) {
    const scheduleDate = new Date('2025-12-20');
    scheduleDate.setDate(scheduleDate.getDate() + i);

    const sch = await prisma.schedule.create({
      data: {
        date: scheduleDate,
        start_time: new Date(scheduleDate.setHours(8, 0, 0, 0)),
        end_time: new Date(scheduleDate.setHours(16, 0, 0, 0)),
        is_available: true
      }
    });
    createdSchedules.push(sch);
  }

  const therapistsData = [
    { name: 'Олексій Коваль', specialization: 'Терапевт', phone: '+380501111111' },
    { name: 'Марія Сидоренко', specialization: 'Травматолог', phone: '+380502222222' },
    { name: 'Сергій Бондар', specialization: 'Кардіолог', phone: '+380503333333' },
    { name: 'Олена Ткаченко', specialization: 'ЛОР', phone: '+380504444444' },
    { name: 'Андрій Шевченко', specialization: 'Хірург', phone: '+380505555555' },
  ];
  const createdTherapists = [];
  for (let i = 0; i < therapistsData.length; i++) {
    const th = await prisma.therapist.create({
      data: { ...therapistsData[i], schedule_id: createdSchedules[i].schedule_id }
    });
    createdTherapists.push(th);
  }

  const patientsData = [
    { name: 'Микола Гнатюк', phone: '+380671000001', birth: '1985-01-10' },
    { name: 'Світлана Іванова', phone: '+380671000002', birth: '1992-03-22' },
    { name: 'Віктор Павлік', phone: '+380671000003', birth: '1970-12-31' },
    { name: 'Тіна Кароль', phone: '+380671000004', birth: '1985-01-25' },
    { name: 'Дмитро Монатік', phone: '+380671000005', birth: '1986-04-01' },
    { name: 'Юлія Саніна', phone: '+380671000006', birth: '1990-10-11' },
    { name: 'Олег Винник', phone: '+380671000007', birth: '1973-07-31' },
    { name: 'Джамала', phone: '+380671000008', birth: '1983-08-27' },
    { name: 'Артем Пивоваров', phone: '+380671000009', birth: '1991-06-28' },
    { name: 'Надя Дорофєєва', phone: '+380671000010', birth: '1990-04-21' },
  ];

  for (let i = 0; i < patientsData.length; i++) {
    const medRec = await prisma.medicalRecord.create({
      data: { notes: `Історія пацієнта ${patientsData[i].name}. Скарг немає.` }
    });

    await prisma.patient.create({
      data: {
        name: patientsData[i].name,
        phone: patientsData[i].phone,
        birth_date: new Date(patientsData[i].birth),
        medical_rec_id: medRec.medical_rec_id,
        diagnosis_id: createdDiagnoses[i % createdDiagnoses.length].diagnosis_id
      }
    });
  }

const allPatients = await prisma.patient.findMany();
  
  for (let i = 0; i < 15; i++) {
    const randomPat = allPatients[i % allPatients.length];
    const randomDoc = createdTherapists[i % createdTherapists.length];
    const randomProc = createdProcedures[i % createdProcedures.length];

    const sessionDate = new Date('2025-12-20');
    sessionDate.setDate(sessionDate.getDate() + i);

    const session = await prisma.session.create({
      data: {
        date: sessionDate, 
        start_time: new Date(sessionDate.setHours(10, 0, 0, 0)),
        duration_minutes: randomProc.duration_minutes,
        status: i % 3 === 0 ? 'Completed' : 'Scheduled',
        room_number: `${100 + i}`,
        patient_id: randomPat.patient_id,
        therapist_id: randomDoc.therapist_id,
        procedure_id: randomProc.procedure_id
      }
    });

    const invoice = await prisma.invoice.create({
      data: {
        session_id: session.session_id,
        amount: randomProc.cost
      }
    });

    if (session.status === 'Completed') {
      await prisma.payment.create({
        data: {
          invoice_id: invoice.invoice_id,
          amount: invoice.amount,
          method: i % 2 === 0 ? 'Card' : 'Cash'
        }
      });
    }
  }

  console.log(' База успішно заповнена ! ');
}

main()
  .catch((e) => {
    console.error('Помилка сідінгу:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });