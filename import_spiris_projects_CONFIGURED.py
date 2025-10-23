#!/usr/bin/env python3
"""
Importera projekt från Spiris Tid Excel-export till MinPrio
Användning: python import_spiris_projects_CONFIGURED.py projektlista.xlsx
"""

import pandas as pd
import sys
import os
from datetime import datetime
from supabase import create_client, Client

# ============================================
# 📝 KONFIGURERA DESSA VÄRDEN
# ============================================

# ──────────────────────────────────────────
# 1️⃣ SUPABASE CREDENTIALS (KRÄVS FÖR IMPORT)
# ──────────────────────────────────────────

SUPABASE_URL = 'https://egmrvvguimqwkosrtcau.supabase.co' 
SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnbXJ2dmd1aW1xd2tvc3J0Y2F1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTk2Nzg1MiwiZXhwIjoyMDc1NTQzODUyfQ.HHiKdPOwYnSxXOMAr_GuFjzj7SwxKTJ_gC0XQGOetXY'
USER_ID = '594ba863-a738-4272-be92-b5602165e7dd'

SPIRIS_APP_ID = 'ap_67b1fb66-0f2b-4088-b3ad-2db55f178366'
SPIRIS_APP_SECRET = 'krFayD@C$¤/FkxiT!M/&s¤$cg&C@xUbI}}z0'  
SPIRIS_BASE_URL = 'https://publicapi.tid.vismaspcs.se'  # ← API URL (normalt oförändrad)

# ──────────────────────────────────────────
# 3️⃣ INSTÄLLNINGAR
# ──────────────────────────────────────────
# Genomsnittligt timpris (används endast om Budget intäkt saknas)
DEFAULT_HOURLY_RATE = 1100  # kr/h (beräknat från din data: 750-1039 kr/h)

# ============================================
# KOD - REDIGERA EJ NEDAN DENNA RAD
# ============================================

def calculate_project_hourly_rate(row) -> float:
    """Beräkna projektspecifikt timpris från budget och kalkylerade timmar"""
    budgeted_hours = row.get('Kalkylerad tid', 0) or 0
    budgeted_revenue = row.get('Budget intäkt', 0) or 0
    
    # Om vi har både budgeterade timmar och intäkt, beräkna timpris
    if budgeted_hours > 0 and budgeted_revenue > 0:
        return round(budgeted_revenue / budgeted_hours, 2)
    
    # Annars försök från faktiska timmar och intäkt
    actual_hours = row.get('Fakturerbar tid', 0) or 0
    invoiced_amount = row.get('Intäkt', 0) or 0
    
    if actual_hours > 0 and invoiced_amount > 0:
        return round(invoiced_amount / actual_hours, 2)
    
    # Sista utväg: default
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
    
    # Beräkna projektspecifikt timpris FÖRST
    hourly_rate = calculate_project_hourly_rate(row)
    
    # Beräkna fakturerade timmar med projektspecifikt timpris
    invoiced_hours = calculate_invoiced_hours(row, hourly_rate)
    
    # Budget intäkt (direkt från Spiris om finns)
    budgeted_revenue = row.get('Budget intäkt')
    budgeted_hours = row.get('Kalkylerad tid')
    
    # Om Budget intäkt saknas men vi har budgeterade timmar, beräkna
    if (pd.isna(budgeted_revenue) or budgeted_revenue == 0) and budgeted_hours and budgeted_hours > 0:
        budgeted_revenue = budgeted_hours * hourly_rate
    
    # Parse datum
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
    
    # Status-mappning
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
        
        # Spiris-koppling
        'spiris_project_id': str(row['Projektnummer']),
        'spiris_last_sync': datetime.now().isoformat(),
        'spiris_sync_enabled': False,  # Sätt True för automatisk synk (framtida)
        
        # Ekonomi - Befintliga fält
        'quoted_hours': budgeted_hours,  # Budgeterade timmar
        'hourly_rate': hourly_rate,
        'external_costs': 0,  # Spiris har inte detta fält separat
        'total_budget': budgeted_revenue,
        
        # Nya resursplaneringsfält
        'budgeted_hours': budgeted_hours,
        'budgeted_revenue': budgeted_revenue,
        'invoiced_hours': invoiced_hours,
        'invoiced_amount': row.get('Intäkt', 0),
        'actual_hours_worked': row.get('Rapporterad tid'),
        'project_manager': row.get('Projektledare'),
        'start_date': start_date,
        'project_deadline': deadline,
        
        # Metadata
        'description': f"Importerat från Spiris Tid (ID: {row['Projektnummer']})",
        'color': '#6366f1',  # Indigo som default
        'completion_percentage': 0  # Kan beräknas senare
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
                # Visa vad som skulle importeras
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
                # Kolla om projektet redan finns (via spiris_project_id)
                existing = supabase.table('projects').select('id').eq('spiris_project_id', spiris_id).execute()
                
                if existing.data:
                    print(f"⚠️  [{idx+1}/{len(df)}] {project_name} - Finns redan (Spiris ID: {spiris_id})")
                    skipped += 1
                else:
                    # Importera projektet
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
    warnings = []
    
    # Kritiska värden (måste vara ifyllda)
    if SUPABASE_URL == 'https://egmrvvguimqwkosrtcau.supabase.co':
        # Detta är faktiskt det rätta värdet från tidigare, så OK!
        print("✅ SUPABASE_URL: Konfigurerad")
    elif 'YOUR_PROJECT' in SUPABASE_URL:
        errors.append("❌ SUPABASE_URL är inte ifylld! Fyll i din Supabase URL.")
    else:
        print("✅ SUPABASE_URL: Konfigurerad")
    
    if 'DIN_SERVICE_ROLE_KEY_HÄR' in SUPABASE_SERVICE_KEY or SUPABASE_SERVICE_KEY == 'YOUR_SERVICE_ROLE_KEY':
        errors.append("❌ SUPABASE_SERVICE_KEY är inte ifylld! Hämta från Supabase Dashboard → API")
    else:
        print("✅ SUPABASE_SERVICE_KEY: Konfigurerad")
    
    if 'DITT_USER_UUID_HÄR' in USER_ID or USER_ID == 'YOUR_USER_UUID':
        errors.append("❌ USER_ID är inte ifylld! Kör i Supabase: SELECT id FROM auth.users;")
    else:
        print("✅ USER_ID: Konfigurerad")
    
    # Valfria värden (för framtida API-integration)
    if 'DIN_SPIRIS_APP_ID_HÄR' in SPIRIS_APP_ID:
        warnings.append("⚠️  SPIRIS_APP_ID är inte ifylld (OK för Excel-import)")
    else:
        print("✅ SPIRIS_APP_ID: Konfigurerad (för framtida API)")
    
    if 'DIN_SPIRIS_SECRET_HÄR' in SPIRIS_APP_SECRET:
        warnings.append("⚠️  SPIRIS_APP_SECRET är inte ifylld (OK för Excel-import)")
    else:
        print("✅ SPIRIS_APP_SECRET: Konfigurerad (för framtida API)")
    
    # Visa resultat
    print()
    if errors:
        print("❌ KRITISKA FEL:")
        for error in errors:
            print(f"   {error}")
        print("\n💡 Fyll i dessa värden i scriptet innan du kör!")
        return False
    
    if warnings:
        print("⚠️  VARNINGAR (ej kritiskt):")
        for warning in warnings:
            print(f"   {warning}")
    
    print("\n✅ Konfiguration OK! Redo att köra import.")
    return True

def main():
    print("=" * 60)
    print("  SPIRIS → MINPRIO IMPORT")
    print("=" * 60)
    print()
    
    # Validera konfiguration
    if not validate_config():
        sys.exit(1)
    
    print()
    
    if len(sys.argv) < 2:
        print("Användning: python import_spiris_projects_CONFIGURED.py <excel-fil> [--import]")
        print("\nExempel:")
        print("  python import_spiris_projects_CONFIGURED.py projektlista.xlsx          # Dry run")
        print("  python import_spiris_projects_CONFIGURED.py projektlista.xlsx --import # Faktisk import")
        sys.exit(1)
    
    filepath = sys.argv[1]
    dry_run = '--import' not in sys.argv
    
    if not os.path.exists(filepath):
        print(f"❌ Filen finns inte: {filepath}")
        sys.exit(1)
    
    # Skapa Supabase-klient
    print("🔌 Ansluter till Supabase...")
    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
        print("✅ Ansluten till Supabase!\n")
    except Exception as e:
        print(f"❌ Kunde inte ansluta till Supabase: {e}")
        sys.exit(1)
    
    # Läs Excel
    df = parse_spiris_excel(filepath)
    
    # Filtrera (valfritt - ta bort projekt du inte vill ha)
    # Exempel: Endast pågående projekt
    # df = df[df['Status'] == 'Pågående']
    
    # Importera
    import_projects(df, supabase, USER_ID, dry_run=dry_run)
    
    print("\n" + "=" * 60)
    print("  KLART!")
    print("=" * 60)

if __name__ == '__main__':
    main()
