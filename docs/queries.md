### Простий SELECT запит №1

Бізнес-питання :
В яких пацієнтів тяжкий діагноз?

SQL-запит :
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
Пояснення : 
- JOIN таблиць "patient" та "diagnosis"
- Фільтрація лише пацієнтів з тяжким діагнозом

Приклад виводу :

![5334645301043728358](https://github.com/user-attachments/assets/a9a3110c-a31a-426e-8ee7-51ae31242d66)


### Простий SELECT запит №2

Бізнес-питання :
Які найближчі заплановані сеанси?

SQL-запит :
```sql
SELECT * FROM session
WHERE status = 'Scheduled'
ORDER BY 'date' ASC;
```
Пояснення : 
- Фільтрація сеансів які лише заплановані
- Сортування результатів хронологічно (від найближчої дати до найдальшої)

Приклад виводу :

![5334645301043728359](https://github.com/user-attachments/assets/9c3fe41e-49e5-4866-8af6-9effc366e737)

### Складний SELECT-запит №1

Бізнес питання :
З якими діагнозами звертаються найчастіше та як дорого обходиться їх лікування?

SQL-запит :
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

Пояснення :
- Групування diagnosis, patient, session та invoice
- Використання SUM для підрахунку суми витраченої на лікування діагнозу серед усіх пацієнтів
- Використання ROUND та AVG для підрахунку середньої витраченої суми за сеанс
- Фільтрація по діагнозам що зустрічались більше ніж один раз
- Сортування за найбільшою сумою

Приклад виводу :

![5337241265176776711](https://github.com/user-attachments/assets/edfd50d8-f038-4e49-9a6d-cdb5722e9560)

### Складний SELECT-запит №2

Бізнес-питання :
До якого лікаря найчастіше записуються та який лікар "найбільш прибутковий"?

SQL-запит :
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

Пояснення : 
- Групування therapist, session та invoice
- Використання SUM для підрахунку повної суми прийомів
- Фільтрація лише тих сеансів які вже відбулись
- Використання CTE для створення статистики лікарів
- Сортування за найбільшою сумою

Приклад виводу :

![5337241265176776712](https://github.com/user-attachments/assets/90943dc9-0a66-4e97-91c1-75fe8ae0b87b)

