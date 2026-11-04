/* Local-only integration QA: leaves clearly marked dummy records for visual review. */
const fs = require('node:fs');
const assert = require('node:assert/strict');
const { PrismaClient } = require('@prisma/client');
const { JwtService } = require('@nestjs/jwt');
require('dotenv').config({ quiet: true });
const prisma = new PrismaClient();
const envUrl = new URL(process.env.DATABASE_URL);
assert(
  ['localhost', '127.0.0.1'].includes(envUrl.hostname),
  'QA requires a local database',
);
assert(process.env.NODE_ENV !== 'production', 'QA is forbidden in production');
const base = `http://127.0.0.1:${process.env.PORT || 3001}/api/v1`;
let token;
const checks = [];
async function api(method, path, body, expected, auth = token) {
  let response;
  for (let attempt = 0; attempt < 65; attempt++) {
    response = await fetch(base + path, {
      method,
      headers: {
        ...(auth ? { Authorization: `Bearer ${auth}` } : {}),
        ...(body && !(body instanceof FormData)
          ? { 'Content-Type': 'application/json' }
          : {}),
      },
      body: body
        ? body instanceof FormData
          ? body
          : JSON.stringify(body)
        : undefined,
    });
    if (response.status !== 429) break;
    await response.arrayBuffer();
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  const type = response.headers.get('content-type') || '';
  const value = type.includes('json')
    ? await response.json()
    : Buffer.from(await response.arrayBuffer());
  assert(
    expected ? [].concat(expected).includes(response.status) : response.ok,
    `${method} ${path}: ${response.status} ${Buffer.isBuffer(value) ? '' : JSON.stringify(value).slice(0, 350)}`,
  );
  checks.push(`${method} ${path}: ${response.status}`);
  return value?.data ?? value;
}
function sign(user, extra = {}) {
  return new JwtService().sign(
    {
      sub: user.id,
      egov_user_id: user.egov_user_id,
      role: user.role,
      irban_id: user.irban_id,
      nama: 'QA Lokal',
      nip: null,
      type: 'access',
      ...extra,
    },
    { secret: process.env.JWT_ACCESS_SECRET, expiresIn: '15m' },
  );
}
async function main() {
  const admin = await prisma.userAccess.findFirstOrThrow({
    where: { role: 'SUPER_ADMIN', is_active: true },
  });
  token = sign(admin);
  const paths = [
    '/irban',
    '/unit-kerja/simpeg',
    '/unit-kerja/mappings',
    '/pejabat',
    '/master-data/jenis-pemeriksaan',
    '/master-data/status-rekomendasi',
    '/master-data/surat-templates',
    '/users',
    '/dashboard/pimpinan',
    '/dashboard/irban',
    '/reports/summary',
    '/surat-peringatan/due',
  ];
  for (const path of paths) await api('GET', path);
  if (!process.argv.includes('--write')) return;
  const tag = `QA-DUMMY-${Date.now()}`;
  const date = (days) =>
    new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
  const today = date(0);
  const irbans = await api('GET', '/irban');
  const units = await api('GET', '/unit-kerja/simpeg');
  const jenis = await api('POST', '/master-data/jenis-pemeriksaan', {
    nama: tag,
  });
  await api('PATCH', `/master-data/jenis-pemeriksaan/${jenis.id}`, {
    nama: tag + ' Pengujian',
  });
  const pending = await api('POST', '/master-data/status-rekomendasi', {
    nama: tag + ' Menunggu',
    kategori: 'BELUM_SELESAI',
    urutan: 90,
  });
  const finished = await api('POST', '/master-data/status-rekomendasi', {
    nama: tag + ' Sesuai',
    kategori: 'SELESAI',
    urutan: 91,
  });
  await api('PATCH', `/master-data/status-rekomendasi/${pending.id}`, {
    urutan: 92,
  });
  const template = await api('POST', '/master-data/surat-templates', {
    jenis_surat: 'QA_DUMMY',
    judul: tag,
    konten_html: '<p>DUMMY QA, BUKAN SURAT RESMI. LHP {{nomor_lhp}}</p>',
  });
  await api('PATCH', `/master-data/surat-templates/${template.id}`, {
    is_active: false,
  });
  const dummy = await prisma.userAccess.create({
    data: {
      egov_user_id: tag,
      role: 'ADMIN_IRBAN',
      irban_id: irbans[0].id,
      is_active: false,
    },
  });
  await api('GET', `/users/${dummy.id}`);
  await api('PATCH', `/users/${dummy.id}`, {
    role: 'ADMIN_IRBAN',
    irban_id: irbans[1].id,
  });
  await api('PATCH', `/users/${dummy.id}/status`, { is_active: false });
  await api(
    'POST',
    '/users/activate',
    { egov_user_id: tag, role: 'ADMIN_IRBAN' },
    400,
  );
  await api('GET', '/users/egov-search?q=QA-DUMMY');
  const pdf = await new Promise((resolve) => {
    const PDF = require('pdfkit');
    const doc = new PDF();
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.text('DUMMY QA SIPATUH - BUKAN DOKUMEN RESMI');
    doc.end();
  });
  const created = [];
  for (let i = 0; i < irbans.length; i++) {
    const irban = irbans[i];
    let unit = units.find((u) => u.assigned_irban?.id === irban.id);
    if (!unit) {
      unit = units.find((u) => !u.is_assigned);
      assert(unit);
      await api('POST', '/unit-kerja/mappings', {
        simpeg_unit_kerja_id: unit.id,
        irban_id: irban.id,
      });
      unit.is_assigned = true;
      unit.assigned_irban = irban;
    }
    const pejabat = await api('POST', '/pejabat', {
      simpeg_unit_kerja_id: unit.id,
      nip: '000000000000000000',
      nama: tag + ' Pejabat',
      jabatan: 'PEJABAT DUMMY QA',
      jenis_penugasan: 'PLT',
      tanggal_mulai: date(100),
    });
    await api('PATCH', `/pejabat/${pejabat.id}`, {
      jabatan: 'PEJABAT DUMMY QA - PENGUJIAN',
    });
    await api('GET', `/pejabat/resolve-recipient/${unit.id}`);
    const payload = {
      nomor_lhp: `${tag}/${i + 1}`,
      tanggal_lhp: date(85),
      tanggal_diterima_lhp: date(80),
      simpeg_unit_kerja_id: unit.id,
      jenis_pemeriksaan_id: jenis.id,
    };
    const lhp = await api('POST', '/lhp', payload);
    created.push(lhp.id);
    assert.equal(lhp.irban_id, irban.id);
    await api('POST', '/lhp', payload, 409);
    await api('PATCH', `/lhp/${lhp.id}`, {
      tanggal_mulai_pemeriksaan: date(100),
      tanggal_selesai_pemeriksaan: date(90),
    });
    const upload = new FormData();
    upload.append(
      'file',
      new Blob([pdf], { type: 'application/pdf' }),
      'dummy-lhp.pdf',
    );
    await api('POST', `/lhp/${lhp.id}/file`, upload);
    assert(
      (await api('GET', `/lhp/${lhp.id}/file`)).subarray(0, 4).toString() ===
        '%PDF',
    );
    const finding = await api('POST', `/lhp/${lhp.id}/temuan`, {
      judul: tag + ' Temuan',
      uraian: 'Pengujian hasil pemeriksaan dummy',
      nilai_temuan: 3000000,
    });
    await api('PATCH', `/temuan/${finding.id}`, {
      judul: tag + ' Temuan diperbarui',
    });
    for (let j = 0; j < 2; j++) {
      const rec = await api('POST', `/temuan/${finding.id}/rekomendasi`, {
        uraian: `${tag} rekomendasi ${j}`,
        nilai_rekomendasi: 1000000,
        status_rekomendasi_id: pending.id,
      });
      await api('PATCH', `/rekomendasi/${rec.id}`, {
        uraian: `${tag} rekomendasi ${j} diperbarui`,
      });
      if (i === 0 && j === 0) {
        const before = await api('GET', `/rekomendasi/${rec.id}/tindak-lanjut`);
        const invalid = new FormData();
        invalid.append('tanggal_diterima', today);
        invalid.append('uraian', tag + ' INVALID UPLOAD');
        invalid.append(
          'files',
          new Blob(['invalid'], { type: 'text/plain' }),
          'invalid.txt',
        );
        await api('POST', `/rekomendasi/${rec.id}/tindak-lanjut`, invalid, 400);
        assert.equal(
          (await api('GET', `/rekomendasi/${rec.id}/tindak-lanjut`)).length,
          before.length,
          'Rejected attachment must not create a follow-up record',
        );
      }
      const form = new FormData();
      form.append('tanggal_diterima', today);
      form.append('uraian', tag + ' bukti tindak lanjut');
      form.append('nilai_tindak_lanjut', String(i === 1 ? 1000000 : 250000));
      form.append(
        'files',
        new Blob([pdf], { type: 'application/pdf' }),
        'dummy-bukti.pdf',
      );
      const tl = await api(
        'POST',
        `/rekomendasi/${rec.id}/tindak-lanjut`,
        form,
      );
      if (i === 0 && j === 0) {
        const before = await api('GET', `/tindak-lanjut/${tl.id}/verifikasi`);
        const badVerification = new FormData();
        badVerification.append('catatan', tag + ' rejected verification');
        badVerification.append('status_rekomendasi_id', finished.id);
        badVerification.append(
          'file',
          new Blob(['invalid'], { type: 'text/plain' }),
          'invalid.txt',
        );
        await api(
          'POST',
          `/tindak-lanjut/${tl.id}/verifikasi`,
          badVerification,
          400,
        );
        assert.equal(
          (await api('GET', `/tindak-lanjut/${tl.id}/verifikasi`)).length,
          before.length,
        );
        const original = await api(
          'GET',
          `/rekomendasi/${rec.id}/tindak-lanjut`,
        );
        await api('POST', `/rekomendasi/${rec.id}/tindak-lanjut`, {
          tanggal_diterima: today,
          uraian: tag + ' iterasi kedua',
          nilai_tindak_lanjut: 100000,
        });
        const history = await api(
          'GET',
          `/rekomendasi/${rec.id}/tindak-lanjut`,
        );
        assert.equal(history.length, original.length + 1);
        assert(
          history.some((row) => row.id === tl.id && row.uraian === tl.uraian),
        );
      }
      assert.equal(
        (await api('GET', `/rekomendasi/${rec.id}`)).status_rekomendasi_id,
        pending.id,
        'Payment must not auto-verify',
      );
      await api('GET', `/rekomendasi/${rec.id}/financial-summary`);
      await api(
        'POST',
        `/tindak-lanjut/${tl.id}/verifikasi`,
        { catatan: '', status_rekomendasi_id: finished.id },
        400,
      );
      if (i === 0 || j === 0) {
        await api('POST', `/tindak-lanjut/${tl.id}/verifikasi`, {
          catatan: tag + ' verifikasi manual',
          status_rekomendasi_id: finished.id,
        });
        assert.equal(
          (await api('GET', `/rekomendasi/${rec.id}`)).status_rekomendasi_id,
          finished.id,
        );
      }
      await api('GET', `/rekomendasi/${rec.id}/tindak-lanjut`);
      await api('GET', `/tindak-lanjut/${tl.id}/verifikasi`);
    }
    await api(
      'GET',
      `/lhp/${lhp.id}`,
      undefined,
      403,
      sign(admin, {
        role: 'ADMIN_IRBAN',
        irban_id: irbans[(i + 1) % irbans.length].id,
      }),
    );
    await api(
      'POST',
      `/lhp/${lhp.id}/temuan`,
      { judul: 'Forbidden', uraian: 'Forbidden' },
      403,
      sign(admin, { role: 'BUPATI' }),
    );
    if (i === 0) {
      await api('POST', `/lhp/${lhp.id}/close`);
      await api(
        'POST',
        `/lhp/${lhp.id}/temuan`,
        { judul: tag, uraian: tag },
        400,
      );
      await api('POST', `/lhp/${lhp.id}/reopen`, {
        alasan: tag + ' pengujian reopen',
      });
      await api('POST', `/lhp/${lhp.id}/close`);
    } else {
      await api('POST', `/lhp/${lhp.id}/close`, undefined, 400);
      await api(
        'POST',
        '/surat-peringatan',
        {
          lhp_id: lhp.id,
          level: 'SP2',
          nomor_surat: `${tag}/INVALID/${i}`,
          tanggal_surat: today,
          pejabat_id: pejabat.id,
        },
        400,
      );
      for (let level = 1; level <= Math.min(i, 3); level++) {
        const sp = await api('POST', '/surat-peringatan', {
          lhp_id: lhp.id,
          level: `SP${level}`,
          nomor_surat: `${tag}/SP${level}/${i}`,
          tanggal_surat: today,
          pejabat_id: pejabat.id,
        });
        assert(
          (await api('GET', `/surat-peringatan/${sp.id}/draft`))
            .subarray(0, 4)
            .toString() === '%PDF',
        );
        await api('POST', `/surat-peringatan/${sp.id}/regenerate-draft`);
        await api('PATCH', `/surat-peringatan/${sp.id}`, {
          nomor_surat: `${tag}/SP${level}/${i}/REV`,
        });
      }
    }
    if (i > 0) {
      const temporary = await api('POST', `/lhp/${lhp.id}/temuan`, {
        judul: tag + ' HAPUS DUMMY',
        uraian: tag,
      });
      const temporaryRec = await api(
        'POST',
        `/temuan/${temporary.id}/rekomendasi`,
        { uraian: tag, status_rekomendasi_id: pending.id },
      );
      await api('DELETE', `/rekomendasi/${temporaryRec.id}`);
      await api('DELETE', `/temuan/${temporary.id}`);
    }
    console.log(`PASS workflow ${irban.kode}`);
  }
  for (const path of paths) await api('GET', path);
  assert(
    (await api('GET', '/dashboard/pimpinan')).summary_kpi.total_rekomendasi >=
      10,
  );
  assert((await api('GET', '/reports/export/excel')).length > 100);
  assert(
    (await api('GET', '/reports/export/pdf')).subarray(0, 4).toString() ===
      '%PDF',
  );
  await api(
    'GET',
    '/dashboard/pimpinan',
    undefined,
    200,
    sign(admin, { role: 'BUPATI' }),
  );
  await api('GET', '/users', undefined, 403, sign(admin, { role: 'BUPATI' }));
  await api('GET', '/dashboard/pimpinan', undefined, 401, '');
  fs.writeFileSync(
    '/tmp/sipatuh-qa-result.json',
    JSON.stringify(
      { tag, checks: checks.length, lhp_ids: created, results: checks },
      null,
      2,
    ),
  );
  console.log('Dummy dataset:', tag);
}
main()
  .then(() => console.log(`PASS ${checks.length} checks`))
  .catch((e) => {
    console.error(e.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
