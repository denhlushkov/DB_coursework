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

