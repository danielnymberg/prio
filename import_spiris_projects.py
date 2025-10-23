#!/usr/bin/env python3
"""
Importera projekt från Spiris Tid Excel-export till MinPrio
Användning: python import_spiris_projects.py projektlista.xlsx [--import]

SÄKERHET: Läser credentials från miljövariabler
Sätt dessa innan du kör:
  export SUPABASE_URL='https://your-project.supabase.co'
  export SUPABASE_SERVICE_KEY='your-service-role-key'
  export MINPRIO_USER_ID='your-user-uuid'
"""

import pandas as pd
import sys
import os
from datetime import datetime
from supabase import create_client, Client

# ============================================
# 📝 LÄS FRÅN MILJÖVARIABLER
# ============================================

SUPABASE_URL = os.environ.get('SUPABASE_URL')
SUPABASE_SERVICE_KEY = os.environ.get('SUPABASE_SERVICE_KEY')
USER_ID = os.environ.get('MINPRIO_USER_ID')

# Valfritt (för framtida API-integration)
SPIRIS_APP_ID = os.environ.get('SPIRIS_APP_ID', '')
SPIRIS_APP_SECRET = os.environ.get('SPIRIS_APP_SECRET', '')
SPIRIS_BASE_URL = os.environ.get('SPIRIS_BASE_URL', 'https://publicapi.tid.vismaspcs.se')

DEFAULT_HOURLY_RATE = 1100  # kr/h

# ============================================
# KOD - REDIGERA EJ NEDAN DENNA RAD
# ============================================

def calculate_project_hourly_rate(row) -> float:
    """Beräkna projektspecifikt timpris från budget och kalkylerade timmar"""
    budgeted_hours = row.get('Kalkylerad tid', 0) or 0
    budgeted_revenue = row.get('Budget intäkt', 0) or 0

    if budgeted_hours > 0 and budgeted_revenue > 0:
        return round(budgeted_revenue / budgeted_hours, 2)

    actual_hours = row.get('Fakturerbar tid', 0) or 0
    invoiced_amount = row.get('Intäkt', 0) or 0

    if actual_hours > 0 and invoiced_amount > 0:
        return round(invoiced_amount / actual_hours, 2)

    return DEFAULT_HOURLY_RATE

def calculate_invoiced_hours(row, hourly_rate: float) -> float:
    """Beräkna fakturerade timmar från intäkt och projektspecifikt timpris"""
    invoiced_amount = row.get('Intäkt', 0) or 0

    if hourly_rate > 0:
        invoiced_hours = invoiced_amount / hourly_rate
    else:
        invoiced_hours = 0

    return round(invoiced_hours, 2)

def parse_spiris_excel(filepath: str) -> pd.DataFrame:
    """Läs och parsa Spiris Excel-export"""
    print(f"📂 Läser fil: {filepath}")
    df = pd.read_excel(filepath)
    print(f"✅ Hittade {len(df)} projekt")
    return df

def map_spiris_to_minprio(row, user_id: str) -> dict:
    """Mappa Spiris-kolumner till MinPrio-projektstruktur"""

    hourly_rate = calculate_project_hourly_rate(row)
    invoiced_hours = calculate_invoiced_hours(row, hourly_rate)

    budgeted_revenue = row.get('Budget intäkt')
    budgeted_hours = row.get('Kalkylerad tid')

    if (pd.isna(budgeted_revenue) or budgeted_revenue == 0) and budgeted_hours and budgeted_hours > 0:
        budgeted_revenue = budgeted_hours * hourly_rate

    start_date = None
    if pd.notna(row.get('Startdatum')):
        try:
            start_date = pd.to_datetime(row['Startdatum']).strftime('%Y-%m-%d')
        except:
            pass

    deadline = None
    if pd.notna(row.get('Slutdatum')):
        try:
            deadline = pd.to_datetime(row['Slutdatum']).isoformat()
        except:
            pass

    status_map = {
        'Pågående': 'active',
        'Avslutat': 'completed',
        'Arkiverat': 'archived'
    }
    status = status_map.get(row.get('Status', 'Pågående'), 'active')

    return {
        'user_id': user_id,
        'name': row['Projekt'],
        'client_name': row.get('Kund'),
        'status': status,

        'spiris_project_id': str(row['Projektnummer']),
        'spiris_last_sync': datetime.now().isoformat(),
        'spiris_sync_enabled': False,

        'quoted_hours': budgeted_hours,
        'hourly_rate': hourly_rate,
        'external_costs': 0,
        'total_budget': budgeted_revenue,

        'budgeted_hours': budgeted_hours,
        'budgeted_revenue': budgeted_revenue,
        'invoiced_hours': invoiced_hours,
        'invoiced_amount': row.get('Intäkt', 0),
        'actual_hours_worked': row.get('Rapporterad tid'),
        'project_manager': row.get('Projektledare'),
        'start_date': start_date,
        'project_deadline': deadline,

        'description': f"Importerat från Spiris Tid (ID: {row['Projektnummer']})",
        'color': '#6366f1',
        'completion_percentage': 0
    }

def import_projects(df: pd.DataFrame, supabase: Client, user_id: str, dry_run: bool = True):
    """Importera projekt till MinPrio"""

    print(f"\n{'🔍 DRY RUN MODE' if dry_run else '🚀 IMPORT MODE'}")
    print("=" * 60)

    imported = 0
    skipped = 0
    errors = []

    for idx, row in df.iterrows():
        project_data = map_spiris_to_minprio(row, user_id)
        project_name = project_data['name']
        spiris_id = project_data['spiris_project_id']

        try:
            if dry_run:
                print(f"\n[{idx+1}/{len(df)}] {project_name}")
                print(f"  Spiris ID: {spiris_id}")
                print(f"  Kund: {project_data['client_name']}")
                print(f"  Timpris: {project_data['hourly_rate']:,.0f} kr/h (projektspecifikt)")
                print(f"  Budgeterade timmar: {project_data['budgeted_hours']} h")
                print(f"  Budgeterad intäkt: {project_data['budgeted_revenue']:,.0f} kr" if project_data['budgeted_revenue'] else "  Budgeterad intäkt: Ej angivet")
                print(f"  Fakturerat: {project_data['invoiced_amount']:,.0f} kr ({project_data['invoiced_hours']:.1f}h)")
                if project_data['budgeted_revenue'] and project_data['budgeted_hours']:
                    remaining_budget = project_data['budgeted_revenue'] - project_data['invoiced_amount']
                    remaining_hours = project_data['budgeted_hours'] - project_data['invoiced_hours']
                    completion_pct = (project_data['invoiced_hours'] / project_data['budgeted_hours']) * 100 if project_data['budgeted_hours'] > 0 else 0
                    print(f"  Kvarvarande: {remaining_hours:.1f}h / {remaining_budget:,.0f} kr")
                    print(f"  Färdigställning: {completion_pct:.0f}%")
                imported += 1
            else:
                existing = supabase.table('projects').select('id').eq('spiris_project_id', spiris_id).execute()

                if existing.data:
                    print(f"⚠️  [{idx+1}/{len(df)}] {project_name} - Finns redan (Spiris ID: {spiris_id})")
                    skipped += 1
                else:
                    result = supabase.table('projects').insert(project_data).execute()
                    print(f"✅ [{idx+1}/{len(df)}] {project_name} - Importerat!")
                    imported += 1

        except Exception as e:
            error_msg = f"❌ [{idx+1}/{len(df)}] {project_name} - Fel: {str(e)}"
            print(error_msg)
            errors.append(error_msg)

    print("\n" + "=" * 60)
    print(f"\n📊 SAMMANFATTNING:")
    print(f"   Importerade: {imported}")
    print(f"   Överhoppade: {skipped}")
    print(f"   Fel: {len(errors)}")

    if errors:
        print(f"\n⚠️  FEL:")
        for error in errors:
            print(f"   {error}")

    if dry_run:
        print(f"\n💡 Detta var en DRY RUN - inget har sparats!")
        print(f"   Kör med --import för att faktiskt importera projekten.")

def validate_config():
    """Validera att alla nödvändiga värden är ifyllda"""
    print("🔍 Validerar konfiguration...\n")

    errors = []

    if not SUPABASE_URL:
        errors.append("❌ SUPABASE_URL är inte satt! Kör: export SUPABASE_URL='...'")
    else:
        print("✅ SUPABASE_URL: Satt")

    if not SUPABASE_SERVICE_KEY:
        errors.append("❌ SUPABASE_SERVICE_KEY är inte satt! Kör: export SUPABASE_SERVICE_KEY='...'")
    else:
        print("✅ SUPABASE_SERVICE_KEY: Satt")

    if not USER_ID:
        errors.append("❌ MINPRIO_USER_ID är inte satt! Kör: export MINPRIO_USER_ID='...'")
    else:
        print("✅ MINPRIO_USER_ID: Satt")

    print()
    if errors:
        print("❌ KRITISKA FEL:")
        for error in errors:
            print(f"   {error}")
        print("\n💡 Sätt miljövariabler innan du kör!")
        return False

    print("✅ Konfiguration OK! Redo att köra import.")
    return True

def main():
    print("=" * 60)
    print("  SPIRIS → MINPRIO IMPORT")
    print("=" * 60)
    print()

    if not validate_config():
        sys.exit(1)

    print()

    if len(sys.argv) < 2:
        print("Användning: python import_spiris_projects.py <excel-fil> [--import]")
        print("\nExempel:")
        print("  python import_spiris_projects.py projektlista.xlsx          # Dry run")
        print("  python import_spiris_projects.py projektlista.xlsx --import # Faktisk import")
        sys.exit(1)

    filepath = sys.argv[1]
    dry_run = '--import' not in sys.argv

    if not os.path.exists(filepath):
        print(f"❌ Filen finns inte: {filepath}")
        sys.exit(1)

    print("🔌 Ansluter till Supabase...")
    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
        print("✅ Ansluten till Supabase!\n")
    except Exception as e:
        print(f"❌ Kunde inte ansluta till Supabase: {e}")
        sys.exit(1)

    df = parse_spiris_excel(filepath)
    import_projects(df, supabase, USER_ID, dry_run=dry_run)

    print("\n" + "=" * 60)
    print("  KLART!")
    print("=" * 60)

if __name__ == '__main__':
    main()
