#!/usr/bin/env python3
"""Cek apakah host:port tunnel bisa dijangkau dari INTERNET (via check-host.net).
Pakai: python3 tools/cek-tunnel.py bore.pub:36603
Ini menjawab pertanyaan 'kenapa HP saya tidak bisa, padahal self-test di VM ok?'"""
import json, sys, time, urllib.request, urllib.parse

def get(url, tries=3):
    for i in range(tries):
        try:
            req = urllib.request.Request(url, headers={'Accept':'application/json','User-Agent':'XyRDP-cek'})
            return json.loads(urllib.request.urlopen(req, timeout=30).read())
        except Exception as e:
            if i == tries-1: raise
            time.sleep(3)

def main(t):
    host, _, port = t.partition(':')
    if not port: print('format: host:port'); return 2
    q = urllib.parse.urlencode({'host': f'{host}:{port}', 'max_nodes': '8'})
    d = get(f'https://check-host.net/check-tcp?{q}')
    if not d.get('ok'):
        print('  check-host menolak permintaan:', json.dumps(d)[:200]); return 1
    rid = d['request_id']; nodes = d.get('nodes', {})
    print(f'  permintaan: {rid}  ({len(nodes)} node)')
    for _ in range(10):
        time.sleep(6)
        r = get(f'https://check-host.net/check-result/{rid}')
        pending = [k for k, v in r.items() if v is None]
        if pending: continue
        ok = fail = 0
        print(f'  {"node":26} {"hasil":28} waktu')
        for nid, val in sorted(r.items()):
            info = nodes.get(nid) or ['?', '?', '?']; neg, negara, kota = info[0], info[1], (info[2] if len(info) > 2 else '')
            if isinstance(val, list) and val and isinstance(val[0], dict):
                v = val[0]
                if v.get('time') is not None:
                    ok += 1; print(f'  {(neg.upper()+": "+kota)[:26]:26} {"TERSAMBUNG":28} {v["time"]:.3f}s')
                else: fail += 1; print(f'  {(neg.upper()+": "+kota)[:26]:26} {"GAGAL: "+str(v.get("error") or "?")[:24]:28}')
            elif isinstance(val, list) and val and val[0] is None:
                fail += 1; print(f'  {(neg.upper()+": "+kota)[:26]:26} {"GAGAL (timeout)":28}')
        tot = ok + fail
        print(f'\n  RINGKASAN: {ok}/{tot} node luar berhasil tersambung ke {host}:{port}')
        print('  -> kalau ≥1 node ASIA tersambung, tunnel memang terbuka ke internet;')
        print('     masalahnya di sisi klien HP (alamat lama / aplikasi), bukan di VM.')
        return 0
    print('  (hasil tidak lengkap dalam 60s)'); return 1

if __name__ == '__main__':
    sys.exit(main(sys.argv[1] if len(sys.argv) > 1 else ''))
