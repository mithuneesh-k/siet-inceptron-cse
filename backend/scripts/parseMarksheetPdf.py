import sys
import json
import re
import os
import pypdf

def parse_pdf(file_path):
    if not os.path.exists(file_path):
        return {"error": f"File not found: {file_path}"}

    reader = pypdf.PdfReader(file_path)
    course_regex = re.compile(r'^(\d{2})\s+([A-Z0-9]+)\s+(.+?)\s+(\d+)\s+([A-Z\+\*]+)\s+([\d\.]+)\s+(PASS|RA\*?)$')

    sem_results = []
    course_results = []
    unmatched_pages = []

    for idx, page in enumerate(reader.pages):
        text = page.extract_text()
        lines = [l.strip() for l in text.splitlines() if l.strip()]

        roll = None
        name = None
        session = None

        for i, l in enumerate(lines[:10]):
            m = re.search(r'\b(714025104\d{3})\b', l)
            if m:
                roll = m.group(1)
                if i > 0 and 'B.E.' not in lines[i-1]:
                    name = lines[i-1].strip()
                elif i > 1:
                    name = lines[i-2].strip()
                break

        for l in lines[:10]:
            m = re.search(r'\b(NOV\s+\d{4}|APR\s+\d{4}|MAY\s+\d{4}|DEC\s+\d{4})\b', l, re.IGNORECASE)
            if m:
                session = m.group(1).upper()
                break

        if not session:
            session = 'APR 2026'

        page_courses = []
        for l in lines:
            cm = course_regex.match(l)
            if cm:
                page_courses.append({
                    'roll_no': roll,
                    'course_semester': int(cm.group(1)),
                    'exam_session': session,
                    'course_code': cm.group(2),
                    'course_name': cm.group(3).strip(),
                    'credits': int(cm.group(4)),
                    'grade': cm.group(5),
                    'grade_points': float(cm.group(6)),
                    'result': cm.group(7),
                    'pdf_page': idx + 1
                })

        # Bottom numbers
        u_idx = -1
        for i, l in enumerate(lines):
            if 'UMIS' in l:
                u_idx = i
                break

        sem_num = 2 if 'APR 2026' in session else 1
        sem_credits = 22 if sem_num == 2 else 23
        earned_credits = sem_credits
        sgpa = 0.0
        cgpa = 0.0
        cumulative_credits = 45 if sem_num == 2 else 23

        if u_idx != -1 and u_idx + 4 < len(lines):
            try:
                sem_credits = int(lines[u_idx+1].split()[-1])
                earned_credits = int(lines[u_idx+2].split()[-1])
                sgpa = float(lines[u_idx+4].split()[-1])
                cum_tokens = lines[u_idx+5].split()
                if len(cum_tokens) >= 2:
                    cumulative_credits = int(cum_tokens[0])
                    cgpa = float(cum_tokens[1])
                elif len(cum_tokens) == 1:
                    cgpa = float(cum_tokens[0])
            except Exception:
                pass

        if roll:
            sem_results.append({
                'roll_no': roll,
                'name': name,
                'semester': sem_num,
                'exam_session': session,
                'sgpa': sgpa,
                'cgpa': cgpa,
                'semester_credits': sem_credits,
                'earned_credits': earned_credits,
                'cumulative_credits': cumulative_credits,
                'source': os.path.basename(file_path),
                'source_rank': idx + 1
            })
            course_results.extend(page_courses)
        else:
            unmatched_pages.append(idx + 1)

    return {
        "success": True,
        "semesters": sem_results,
        "courses": course_results,
        "unmatched_pages": unmatched_pages
    }

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Missing file path"}))
        sys.exit(1)

    result = parse_pdf(sys.argv[1])
    print(json.dumps(result))
