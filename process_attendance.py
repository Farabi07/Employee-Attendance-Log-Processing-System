import os
import json
from datetime import datetime
from collections import defaultdict
import openpyxl

class AttendanceProcessor:
    def __init__(self, folder="attendance_logs"):
        self.folder = folder
        self.data = {}
        self.errors = []
    
    def read_files(self):
        records = []
        
        if not os.path.exists(self.folder):
            print(f"Folder {self.folder} not found")
            return records
            
        files = [f for f in os.listdir(self.folder) if f.endswith('.log')]
        print(f"Found {len(files)} log files")
        
        for file in files:
            path = os.path.join(self.folder, file)
            with open(path, 'r') as f:
                for line_num, line in enumerate(f):
                    line = line.strip()
                    if not line:
                        continue
                        
                    parts = line.split()
                    if len(parts) < 4:
                        self.errors.append(f"Bad line in {file}: {line}")
                        continue
                    
                    emp_id = parts[0]
                    name = f"{parts[1]} {parts[2]}"
                    timestamp_str = parts[3]
                    
                    try:
                        if timestamp_str.isdigit():
                            ts = datetime.fromtimestamp(int(timestamp_str))
                        else:
                            # Try common format
                            ts = datetime.strptime(timestamp_str, "%Y-%m-%d %H:%M:%S")
                    except:
                        self.errors.append(f"Bad timestamp {timestamp_str} in {file}")
                        continue
                    
                    records.append({
                        'emp_id': emp_id,
                        'name': name, 
                        'timestamp': ts
                    })
        
        return records
    
    def RemoveDuplicate(self, records):
        seen = set()
        clean = []
        
        for r in records:
            key = (r['emp_id'], r['timestamp'])
            if key not in seen:
                seen.add(key)
                clean.append(r)
        
        print(f"Removed {len(records) - len(clean)} duplicates")
        return clean
    
    def GroupByDate(self, records):
        grouped = defaultdict(lambda: defaultdict(list))
        
        for record in records:
            date = record['timestamp'].date().strftime('%Y-%m-%d')
            emp = record['emp_id']
            grouped[date][emp].append(record)
        
        return grouped
    
    def Calculate(self, grouped_data):
        summary = {}
        
        for date, employees in grouped_data.items():
            summary[date] = []
            
            for emp_id, records in employees.items():
                if not records:
                    continue
                records.sort(key=lambda x: x['timestamp'])
                
                first_punch = records[0]['timestamp'].strftime('%H:%M')
                last_punch = records[-1]['timestamp'].strftime('%H:%M')
                total_punches = len(records)
                duration = records[-1]['timestamp'] - records[0]['timestamp']
                hours = duration.total_seconds() / 3600
                late = records[0]['timestamp'].time() > datetime.strptime('09:30', '%H:%M').time()
                early_exit = records[-1]['timestamp'].time() < datetime.strptime('17:00', '%H:%M').time()
                
                summary[date].append({
                    'emp_id': emp_id,
                    'name': records[0]['name'],
                    'first_punch': first_punch,
                    'last_punch': last_punch, 
                    'total_punches': total_punches,
                    'hours': round(hours, 2),
                    'late': late,
                    'early_exit': early_exit
                })
        
        return summary
    
    def save_json(self, data, filename='attendance_summary.json'):
        with open(filename, 'w') as f:
            json.dump(data, f, indent=2, default=str)
        print(f"Saved JSON to {filename}")
    
    def save_excel(self, data, filename='attendance_report.xlsx'):
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Attendance Report"
        headers = ['Date', 'Emp ID', 'Name', 'First Punch', 'Last Punch', 'Total Punches', 'Hours', 'Late', 'Early Exit']
        ws.append(headers)
        for date, entries in data.items():
            for entry in entries:
                row = [
                    date,
                    entry['emp_id'],
                    entry['name'],
                    entry['first_punch'],
                    entry['last_punch'],
                    entry['total_punches'],
                    entry['hours'],
                    'Yes' if entry['late'] else 'No',
                    'Yes' if entry['early_exit'] else 'No'
                ]
                ws.append(row)
        
        wb.save(filename)
        print(f"Saved Excel to {filename}")
    
    def process(self):
        print("Starting attendance processing...")
        records = self.read_files()
        print(f"Total records: {len(records)}")
        if not records:
            print("No records found, exiting")
            return
        records = self.remove_dupes(records)
        grouped = self.group_by_date(records)
        summary = self.calculate_summary(grouped)
        
        self.save_json(summary)
        self.save_excel(summary)
        total_entries = sum(len(entries) for entries in summary.values())
        late_count = sum(1 for entries in summary.values() for entry in entries if entry['late'])
        early_count = sum(1 for entries in summary.values() for entry in entries if entry['early_exit'])
        
        print("Processing complete")
        print("Total employee-day records: {total_entries}")
        print("Late arrivals: {late_count}")
        print("Early exits: {early_count}")
        print("Errors encountered: {len(self.errors)}")
        
        if self.errors:
            print("\nErrors:")
            for error in self.errors[:5]:
                print(f"  - {error}")
            if len(self.errors) > 5:
                print(f"and {len(self.errors) - 5} more")

def main():
    processor = AttendanceProcessor()
    processor.process()

if __name__ == "__main__":
    main()