### Простий SELECT запит №1

**Бізнес-питання:**
В яких пацієнтів тяжкий діагноз?

**SQL-запит:**
```sql
SELECT
  p.name AS patient_name,
  p.phone,
  d.title AS diagnosis,
  d.severity_level
FROM "patient" p
JOIN "diagnosis" d ON p.diagnosis_id = d.diagnosis_id
WHERE d.severity_level = 'Severe';
```
**Пояснення:**
- **JOIN** таблиць **"patient"** та **"diagnosis"**
- Фільтрація лише пацієнтів з тяжким діагнозом

**Приклад виводу:**

![5334645301043728358](https://github.com/user-attachments/assets/a9a3110c-a31a-426e-8ee7-51ae31242d66)

---

### Простий SELECT запит №2

**Бізнес-питання:**
Які найближчі заплановані сеанси?

**SQL-запит:**
```sql
SELECT * FROM session
WHERE status = 'Scheduled'
ORDER BY 'date' ASC;
```
**Пояснення:**
- Фільтрація сеансів які лише заплановані
- Сортування результатів хронологічно (від найближчої дати до найдальшої)

**Приклад виводу:**

![5334645301043728359](https://github.com/user-attachments/assets/9c3fe41e-49e5-4866-8af6-9effc366e737)

---

### Простий SELECT запит №3

**Бізнес-питання:**
Запит повертає список запланованих візитів  з повною інформацією про час, пацієнта, лікаря та процедуру.

**SQL-запит:**
```sql
SELECT 
    s.date, 
    s.start_time, 
    p.name AS patient_name, 
    t.name AS doctor_name, 
    pr.title AS procedure_title
FROM "Session" s
JOIN "Patient" p ON s.patient_id = p.patient_id
JOIN "Therapist" t ON s.therapist_id = t.therapist_id
JOIN "Procedure" pr ON s.procedure_id = pr.procedure_id
WHERE s.status = 'Scheduled'
ORDER BY s.date ASC, s.start_time ASC
LIMIT 5 OFFSET 0;

```

**Пояснення:**

- Беремо таблицю сеансів як основну
- Приєднуємо таблиці `Patient`, `Therapist` та `Procedure` за їхніми ID, щоб замість числових ідентифікаторів отримати імена та назви
- Відфільтровуємо лише ті записи, де статус візиту `Scheduled`
- Сортуємо результати хронологічно: спочатку за датою, потім за часом початку
- Беремо лише перші 5 рядків результату

**Приклад виводу:**

![1гит](https://github.com/user-attachments/assets/eac0830f-dc3f-491f-940c-b846deadb5aa)

---

### Простий SELECT запит №4

**Бізнес-питання:**
Запит формує список пацієнтів, які мають діагнози з рівнями тяжкості "High" (Високий) або "Critical" (Критичний).

**SQL-запит:**

```sql
SELECT 
    p.name, 
    p.phone, 
    d.title AS diagnosis, 
    d.severity_level
FROM "Patient" p
JOIN "Diagnosis" d ON p.diagnosis_id = d.diagnosis_id
WHERE d.severity_level IN ('Critical', 'High')
ORDER BY d.severity_level DESC, p.name ASC
LIMIT 10 OFFSET 0;

```

**Пояснення:**

-  Вибираємо таблицю пацієнтів
-  Підтягуємо інформацію про діагноз кожного пацієнта
-  Використовуємо оператор `IN`, щоб вибрати рядки, де рівень тяжкості збігається з одним зі списку (`Critical`, `High`)
-  Сортуємо спочатку за тяжкістю (від критичних до високих), а потім за алфавітом імен пацієнтів
-  Обмежуємо вибірку 10 записами

**Приклад виводу:**

![2гит](https://github.com/user-attachments/assets/d658699f-06cc-4deb-8649-1ab218550524)

---

### Складний SELECT-запит №1

**Бізнес-питання:**
З якими діагнозами звертаються найчастіше та як дорого обходиться їх лікування?

**SQL-запит:**
```sql
SELECT 
    d.title AS diagnosis_title,
    d.severity_level,
    COUNT(DISTINCT p.patient_id) AS unique_patients,
    COUNT(s.session_id) AS total_visits,
    SUM(i.amount) AS total_revenue_from_diagnosis,
    ROUND(AVG(i.amount), 2) AS avg_check_per_visit
FROM "diagnosis" d
JOIN "patient" p ON d.diagnosis_id = p.diagnosis_id
JOIN "session" s ON p.patient_id = s.patient_id
JOIN "invoice" i ON s.session_id = i.session_id
GROUP BY d.title, d.severity_level
HAVING COUNT(s.session_id) >= 1
ORDER BY total_revenue_from_diagnosis DESC;
```

**Пояснення:**
- Групування `diagnosis`, `patient`, `session` та `invoice`
- Використання **SUM** для підрахунку суми витраченої на лікування діагнозу серед усіх пацієнтів
- Використання **ROUND** та **AVG** для підрахунку середньої витраченої суми за сеанс
- Фільтрація по діагнозам що зустрічались більше ніж один раз
- Сортування за найбільшою сумою

**Приклад виводу:**

![5337241265176776711](https://github.com/user-attachments/assets/edfd50d8-f038-4e49-9a6d-cdb5722e9560)

---

### Складний SELECT-запит №2

**Бізнес-питання:**
До якого лікаря найчастіше записуються та який лікар "найбільш прибутковий"?

**SQL-запит:**
```sql
WITH TherapistStats AS (
    SELECT 
        t.name AS therapist_name,
        t.specialization,
        COUNT(s.session_id) AS sessions_count,
        SUM(i.amount) AS total_revenue
    FROM "therapist" t
    JOIN "session" s ON t.therapist_id = s.therapist_id
    JOIN "invoice" i ON s.session_id = i.session_id
    WHERE s.status = 'Completed'
    GROUP BY t.therapist_id, t.name, t.specialization
)
SELECT * FROM TherapistStats
ORDER BY total_revenue DESC;
```

**Пояснення:**
- Групування `therapist`, `session` та `invoice`
- Використання **SUM** для підрахунку повної суми прийомів
- Фільтрація лише тих сеансів які вже відбулись
- Використання **CTE** для створення статистики лікарів
- Сортування за найбільшою сумою

**Приклад виводу:**

![5337241265176776712](https://github.com/user-attachments/assets/90943dc9-0a66-4e97-91c1-75fe8ae0b87b)

---

### Складний SELECT-запит №3

**Бізнес-питання:**
Цей запит аналізує роботу кожного лікаря. Він рахує кількість проведених сеансів, загальний дохід, який приніс лікар, середній чек, і присвоює йому категорію ("Top Performer", "Average", etc.) на основі зароблених грошей.

**SQL-запит:**

```sql
WITH TherapistStats AS (
    SELECT 
        t.therapist_id,
        t.name AS therapist_name,
        t.specialization,
        COUNT(s.session_id) AS total_sessions,
        SUM(i.amount) AS total_revenue,
        AVG(i.amount) AS avg_check_value,
        DENSE_RANK() OVER (ORDER BY SUM(i.amount) DESC) as revenue_rank
    FROM "Therapist" t

    JOIN "Session" s ON t.therapist_id = s.therapist_id
    JOIN "Invoice" i ON s.session_id = i.session_id 
    JOIN "Procedure" p ON s.procedure_id = p.procedure_id
    WHERE s.status = 'Completed'      AND i.issue_date >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '3 months') 
    GROUP BY t.therapist_id, t.name, t.specialization
    HAVING COUNT(s.session_id) >= 1
)

SELECT 
    therapist_name,
    specialization,
    total_sessions,
    total_revenue,
    ROUND(avg_check_value, 2) as avg_check,
    revenue_rank,

    CASE 
        WHEN revenue_rank <= 3 THEN 'Top Performer'
        WHEN total_sessions > 10 THEN 'Experienced'
        ELSE 'Regular Staff'
    END as performance_tier

FROM TherapistStats
ORDER BY total_revenue DESC;
```

**Приклад виводу:**

![5гит](https://github.com/user-attachments/assets/aea36726-8e6e-459a-9658-94f57b1c7812)

---

### Складний SELECT-запит №4

**Бізнес-питання:** 
Цей запит розраховує середню фактичну тривалість кожної процедури на основі завершених сеансів.

**SQL-запит:**
```sql
SELECT 
    p."title" AS procedure_name,
    ROUND(AVG(s."duration_minutes"), 1) AS average_real_duration,
    p."duration_minutes" AS standard_duration,
    ROUND(AVG(s."duration_minutes") - p."duration_minutes", 1) AS time_deviation,
    COUNT(s."session_id") AS total_sessions
FROM "Procedure" p

JOIN "Session" s ON p."procedure_id" = s."procedure_id"
WHERE s."status" = 'Completed'

GROUP BY p."title", p."duration_minutes"
ORDER BY average_real_duration DESC;

```

**Приклад виводу:**

![6гит](https://github.com/user-attachments/assets/6cf3b465-3d22-4fb1-8d22-55bebe640261)

---

### Складний SELECT-запит №5

**Бізнес-питання:**
Аналітичний звіт, що показує загальний дохід від кожного типу процедур, їхню кількість, а також визначає ранг популярності та порівнює дохід із середнім глобальним показником.

**SQL-запит:**

```sql
WITH ProcedureRevenue AS (
    SELECT 
        pr.title,
        COUNT(s.session_id) as total_sessions,
        SUM(i.amount) as total_money
    FROM "Procedure" pr
    JOIN "Session" s ON pr.procedure_id = s.procedure_id
    JOIN "Invoice" i ON s.session_id = i.session_id
    GROUP BY pr.title
)
SELECT 
    title,
    total_sessions,
    total_money,
    RANK() OVER (ORDER BY total_money DESC) as popularity_rank,
    ROUND(AVG(total_money) OVER (), 2) as global_average
FROM ProcedureRevenue;

```

**Пояснення:**

- Спочатку створюємо тимчасову таблицю, де групуємо дані за назвою процедури
- Всередині **CTE** використовуємо `COUNT` (кількість сеансів) та `SUM` (сума грошей з інвойсів)
- У головному запиті віконна функція присвоює ранг (1, 2, 3...) кожній процедурі на основі зароблених грошей (`ORDER BY total_money DESC`)
- Друга віконна функція рахує середнє значення стовпця `total_money` по *всьому* набору даних (порожнє вікно `OVER()`), дозволяючи порівняти конкретний рядок із загальним середнім

**Приклад виводу:**

![3гит](https://github.com/user-attachments/assets/2e5a9515-c0a2-4976-b458-a11e68307f3a)

---

### Складний SELECT-запит №6

**Бізнес-питання:**
Запит аналізує, які процедури найчастіше призначаються для пацієнтів різних категорій тяжкості, та порівнює дохід від цих процедур із середнім показником всередині тієї ж категорії тяжкості.

**SQL-запит:**

```sql
WITH DiagnosisServiceStats AS (
    SELECT 
        d.severity_level,
        pr.title AS procedure_title,
        COUNT(s.session_id) as usage_count,
        SUM(i.amount) as total_revenue
    FROM "Diagnosis" d
    JOIN "Patient" p ON d.diagnosis_id = p.diagnosis_id
    JOIN "Session" s ON p.patient_id = s.patient_id
    JOIN "Procedure" pr ON s.procedure_id = pr.procedure_id
    JOIN "Invoice" i ON s.session_id = i.session_id
    GROUP BY d.severity_level, pr.title
)
SELECT 
    severity_level,
    procedure_title,
    usage_count,
    total_revenue,
    RANK() OVER (PARTITION BY severity_level ORDER BY usage_count DESC) as popularity_rank,
    ROUND(AVG(total_revenue) OVER (PARTITION BY severity_level), 2) as avg_revenue_for_severity_group
FROM DiagnosisServiceStats
ORDER BY severity_level, popularity_rank;

```

**Пояснення:**

- У **CTE** об'єднуємо 5 таблиць, пов'язуємо діагноз пацієнта з грошима за процедуру
- Групуємо дані за *парою* значень: "Рівень тяжкості" + "Назва процедури"
- **RANK() ... PARTITION BY**: Віконна функція ранжує процедури за популярністю, але *скидає* лічильник для кожної нової групи тяжкості (`severity_level`). Тобто ми отримуємо Топ-1 для 'Critical', Топ-1 для 'Low' ...
- **AVG() ... PARTITION BY**: Рахує середній дохід тільки в межах поточної групи тяжкості.

**Приклад виводу:**

![4гит](https://github.com/user-attachments/assets/63896868-b923-466c-aae7-65b99577adc0)
