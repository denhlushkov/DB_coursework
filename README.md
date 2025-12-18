# Реабілітаційний центр

## Огляд Проєкту

Цей проєкт є курсовою роботою з дисципліни "Бази даних" та реалізує повноцінну систему управління для сучасного реабілітаційного центру.
### Призначення та предметна область
Метою проєкту є створення надійної та ефективної бази даних та програмного інтерфейсу для автоматизації ключових процесів реабілітаційного центру.

Система охоплює такі основні предметні області:

* Управління пацієнтами: Реєстрація, зберігання історії хвороби, діагнозів та персональних даних.
* Планування терапії: Призначення індивідуальних програм реабілітації (процедури, вправи), контроль їх виконання.
* Персонал та ресурси: Облік лікарів, терапевтів, графіків їх роботи та доступності обладнання (кабінетів).
* Фінансовий облік: Відстеження вартості та оплати наданих послуг.

---

### Використані Технології
Проєкт використовує сучасний стек технологій для забезпечення гнучкості, надійності та простоти розгортання:
* База даних: PostgreSQL
* ORM: Prisma
* Бекенд: JavaScript/Node.js
* Контейнеризація: Docker та Docker Compose для легкого розгортання середовища.

---

### Опис схеми бази даних
Система включає **9 основних таблиць** з'єднаних між собою:

- **Schedule (Розклад)** 
- **Diagnosis (Діагнози)**
- **Procedure (Процедури)**
- **Therapist (Лікарі)**
- **Patient (Пацієнти)**
- **Medical_Record (Медичний Запис)**
- **Session (Сеанси/Візити)**
- **Invoice (Рахунки)**
- **Payment (Оплати)**

Детальна інформація про схему - [`docs/schema.md`](docs/schema.md)

---

### Учасники проекту
- **Глушков Денис**
- **Бєлов Владислав**
- **Жмуденко Даніїл**

Розподіл роботи можна переглянути - [`docs/contibutions.md`](docs/contributions.md)

---

## Інструкції з налаштування та запуску

Для коректної роботи системи на локальній машині необхідно мати встановлені:
* **Node.js** (версії 18+ рекомендується)
* **Docker** та **Docker Compose** (для бази даних)

### 1. Встановлення залежностей

Склонуйте репозиторій та встановіть необхідні npm-пакети:

```bash
git clone 
cd DB_coursework
npm install

```

### 2. Налаштування змінних середовища

Створіть файл `.env` на основі прикладу `.env.example`. Це необхідно для підключення до бази даних.

```bash
cp .env.example .env

```

> За замовчуванням: `postgresql://postgres:1488@localhost:5433/reability?schema=public`

### 3. Запуск Бази Даних (Docker)

Запустіть контейнер з PostgreSQL:

```bash
docker-compose up -d

```

Переконайтеся, що контейнер запущено:

```bash
docker ps

```

### 4. Ініціалізація Prisma (ORM)

1. **Генерація клієнта**:
```bash
npx prisma generate

```

2. **Міграція схеми**:
```bash
npx prisma migrate dev --name init

```

3. **Наповнення бази тестовими даними**:
```bash
npx prisma db seed

```

*Після виконання ви маєте побачити повідомлення: `База успішно заповнена!`*

### 5. Запуск сервера

Для запуску API у режимі розробки:

```bash
npm start

```

Сервер буде доступний за адресою: `http://localhost:3000`.

---


## Запуск тестів

Проект містить інтеграційні та модульні тести. Перед запуском переконайтеся, що база даних активна.

**Запуск усіх тестів:**

```bash
npm test

```

**Для запуску конкретного тестового файлу:**

```bash
node --test/шлях до конкретного файлу теста

```

**Запуск усіх інтеграціоних тестів:**

```bash
node --test test/integration

```

## Структура проекту

```
DB_coursework/
├── docs/                       # Документація проекту
│   ├──contributions.md
│   ├──schema.md
│   └──queries.md
│
├── prisma/                     # Конфігурація бази даних та ORM
│   ├── migrations/             # Міграції бази даних (SQL)
│   ├── schema.prisma           # Схема БД (моделі та зв'язки)
│   └── seed.js                 # Скрипт наповнення бази тестовими даними
│
├── src/                        # Вихідний код бекенду
│   ├── config/                 # Конфігурація
│   │   └── database.js         # Налаштування підключення до БД
│   │
│   ├── controllers/            # Контролери (обробка запитів)
│   │   ├── __tests__/          # Юніт-тести контролерів
│   │   │   ├── diagnosis.controller.test.js
│   │   │   ├── invoice.controller.test.js
│   │   │   ├── medicalRecord.controller.test.js
│   │   │   ├── patient.controller.test.js
│   │   │   ├── payment.controller.test.js
│   │   │   ├── procedure.controller.test.js
│   │   │   ├── schedule.controller.test.js
│   │   │   ├── session.controller.test.js
│   │   │   └── therapist.controller.test.js
│   │   │
│   │   ├── diagnosis.controller.js
│   │   ├── invoice.controller.js
│   │   ├── medicalRecord.controller.js
│   │   ├── patient.controller.js
│   │   ├── payment.controller.js
│   │   ├── procedure.controller.js
│   │   ├── schedule.controller.js
│   │   ├── session.controller.js
│   │   └── therapist.controller.js
│   │
│   ├── middleware/             # Проміжне ПЗ
│   │   ├── errorHandler.js     # Обробник помилок
│   │   └── validation.js       # Валідація даних запиту
│   │
│   ├── routes/                 # Маршрутизація API
│   │   ├── diagnosis.routes.js
│   │   ├── invoice.routes.js
│   │   ├── medicalRecord.routes.js
│   │   ├── patient.routes.js
│   │   ├── payment.routes.js
│   │   ├── procedure.routes.js
│   │   ├── schedule.routes.js
│   │   ├── session.routes.js
│   │   └── therapist.routes.js
│   │
│   ├── utils/                  # Допоміжні утиліти
│   │   ├── constants.js        # Константи проекту
│   │   └── helpers.js          # Загальні функції-помічники
│   │
│   ├── app.js                  # Ініціалізація Express додатку
│   └── server.js               # Точка входу (запуск сервера)
│
├── test/                       # Глобальні тести
│   └── integration/            # Інтеграційні тести API
│       ├── diagnoses.api.test.js
│       ├── helpers.js          # Хелпери для тестів
│       ├── patients.api.test.js
│       └── procedures.api.test.js
│
├── .dockerignore               # Виключення для Docker
├── .env.example                # Приклад змінних оточення
├── .gitignore                  # Ігнорування Git
├── docker-compose.yml          # Конфігурація Docker контейнерів
├── Dockerfile                  # Конфігурація образу Node.js
├── package.json                # Залежності та скрипти
├── prisma.config.ts            # Конфігурація Prisma CLI
└── README.md                   # Основна документація

```
