import psycopg, json

DSN = "postgresql://app_user:CoppAddresdDev!2026@localhost:5432/coppaddresd"
with psycopg.connect(DSN) as conn:
    with conn.cursor() as cur:
        cur.execute(
            "SELECT id, city_id FROM app.patient_profiles WHERE deleted_at IS NULL AND city_id IS NOT NULL"
        )
        patients = cur.fetchall()
        print("patients with city", len(patients))
        cur.execute(
            "SELECT id, code FROM app.cities WHERE id IN (SELECT DISTINCT city_id FROM app.patient_profiles WHERE city_id IS NOT NULL) LIMIT 5"
        )
        print(cur.fetchall())
        # health results severity
        cur.execute("""
            SELECT e.patient_id, r.severity, r.value
            FROM app.health_test_results r
            JOIN app.health_test_evaluations e ON r.evaluation_id=e.id
            WHERE r.result_type='score' AND e.patient_id IN (SELECT id FROM app.patient_profiles WHERE city_id IS NOT NULL)
            LIMIT 5
        """)
        print(cur.fetchall())
        # cities aggregation like repo
        cur.execute("""
            SELECT c.name, s.code, count(*) 
            FROM app.patient_profiles p
            JOIN app.cities c ON c.id=p.city_id
            JOIN app.states s ON s.id=c.state_id
            WHERE p.deleted_at IS NULL AND p.city_id IS NOT NULL
            GROUP BY c.name, s.code
            ORDER BY count(*) DESC
            LIMIT 5
        """)
        for row in cur.fetchall():
            print(row)
