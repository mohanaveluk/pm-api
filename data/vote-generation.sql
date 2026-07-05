INSERT INTO survey.votes (id, voter_email, gender, age, location, survey_id, party_id)
SELECT
    UUID(),
    CONCAT(
        LOWER(first_name),'.',
        LOWER(last_name),
        FLOOR(RAND()*100),
        '@gmail.com'
    ) AS voter_email,
    IF(RAND() > 0.5,'male','female') AS gender,
    FLOOR(18 + (RAND() * 58)) AS age,
    ELT(FLOOR(1 + (RAND()*10)),
        'New York','Chicago','Houston','Dallas','Miami',
        'Seattle','San Jose','Boston','Denver','Atlanta', 'Concord', 'Austin', 'Los Vegas', 'Los Angeles', 'San Fransisco', 'Santa Barbara'
    ) AS location,
    'phd5j5jmumnm0g412',
    ELT(FLOOR(1 + (RAND()*4)),
        '1c6d423c-f74c-48db-aa08-f97b4b771b88',
        'cb45dbb4-566e-494d-9d1c-ed33a7882197',
        '25600d34-b002-42a1-b18f-cdd2eb43bd06',
        '30666bff-d6f6-4e2e-a7ab-23de71a3c9b4'
    )
FROM (
    SELECT
        ELT(FLOOR(1 + (RAND()*20)),
            'James','John','Robert','Michael','David',
            'William','Richard','Joseph','Thomas','Charles',
            'Mary','Patricia','Jennifer','Linda','Elizabeth',
            'Barbara','Susan','Jessica','Sarah','Karen'
        ) AS first_name,
        ELT(FLOOR(1 + (RAND()*20)),
            'Smith','Johnson','Williams','Brown','Jones',
            'Garcia','Miller','Davis','Rodriguez','Martinez',
            'Hernandez','Lopez','Gonzalez','Wilson','Anderson',
            'Thomas','Taylor','Moore','Jackson','Martin'
        ) AS last_name
    FROM
        (SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5
         UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9 UNION SELECT 10
         UNION SELECT 11 UNION SELECT 12 UNION SELECT 13 UNION SELECT 14 UNION SELECT 15
         UNION SELECT 16 UNION SELECT 17 UNION SELECT 18 UNION SELECT 19 UNION SELECT 20
         UNION SELECT 21 UNION SELECT 22 UNION SELECT 23 UNION SELECT 24 UNION SELECT 25
         UNION SELECT 26 UNION SELECT 27 UNION SELECT 28 UNION SELECT 29 UNION SELECT 30
         UNION SELECT 31 UNION SELECT 32 UNION SELECT 33 UNION SELECT 34 UNION SELECT 35
         UNION SELECT 36 UNION SELECT 37 UNION SELECT 38 UNION SELECT 39 UNION SELECT 40
         UNION SELECT 41 UNION SELECT 42 UNION SELECT 43 UNION SELECT 44 UNION SELECT 45
         UNION SELECT 46 UNION SELECT 47 UNION SELECT 48 UNION SELECT 49 UNION SELECT 50
         UNION SELECT 51 UNION SELECT 52 UNION SELECT 53 UNION SELECT 54 UNION SELECT 55
         UNION SELECT 56 UNION SELECT 57 UNION SELECT 58 UNION SELECT 59 UNION SELECT 60
         UNION SELECT 61 UNION SELECT 62 UNION SELECT 63 UNION SELECT 64 UNION SELECT 65
         UNION SELECT 66 UNION SELECT 67 UNION SELECT 68 UNION SELECT 69 UNION SELECT 70
         UNION SELECT 71 UNION SELECT 72 UNION SELECT 73 UNION SELECT 74 UNION SELECT 75
         UNION SELECT 76 UNION SELECT 77 UNION SELECT 78 UNION SELECT 79 UNION SELECT 80
         UNION SELECT 81 UNION SELECT 82 UNION SELECT 83 UNION SELECT 84 UNION SELECT 85
         UNION SELECT 86 UNION SELECT 87 UNION SELECT 88 UNION SELECT 89 UNION SELECT 90
         UNION SELECT 91 UNION SELECT 92 UNION SELECT 93 UNION SELECT 94 UNION SELECT 95
         UNION SELECT 96 UNION SELECT 97 UNION SELECT 98 UNION SELECT 99 UNION SELECT 100
        ) t
) names;