import db from "../database/connection";

export interface TPS {
  id: number;
  election_id: number;
  tps_number: string | null;
  tps_code: string | null;
  province: string | null;
  city_regency: string | null;
  district: string | null;
  village: string | null;
  address: string | null;
  status: string;
  registered_voters_total: number;
  created_at: string;
  updated_at: string;
}

export const TpsService = {
  getAll(electionId?: number): TPS[] {
    if (electionId) {
      const stmt = db.prepare("SELECT * FROM tps WHERE election_id = ? ORDER BY id DESC");
      return stmt.all(electionId) as unknown as TPS[];
    } else {
      const stmt = db.prepare("SELECT * FROM tps ORDER BY id DESC");
      return stmt.all() as unknown as TPS[];
    }
  },

  getById(id: number): TPS | null {
    const stmt = db.prepare("SELECT * FROM tps WHERE id = ?");
    const tps = stmt.get(id);
    return tps ? (tps as unknown as TPS) : null;
  },

  create(data: {
    election_id: number;
    tps_number?: string;
    tps_code?: string;
    province?: string;
    city_regency?: string;
    district?: string;
    village?: string;
    address?: string;
    status?: string;
    registered_voters_total?: number;
  }): TPS {
    const stmt = db.prepare(`
      INSERT INTO tps (
        election_id, tps_number, tps_code, province, city_regency, 
        district, village, address, status, registered_voters_total
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const status = data.status || "DRAFT";
    const regVoters = data.registered_voters_total !== undefined ? data.registered_voters_total : 0;
    
    const result = stmt.run(
      data.election_id,
      data.tps_number || null,
      data.tps_code || null,
      data.province || null,
      data.city_regency || null,
      data.district || null,
      data.village || null,
      data.address || null,
      status,
      regVoters
    );
    
    return this.getById(Number(result.lastInsertRowid))!;
  },

  update(
    id: number,
    data: {
      election_id?: number;
      tps_number?: string;
      tps_code?: string;
      province?: string;
      city_regency?: string;
      district?: string;
      village?: string;
      address?: string;
      status?: string;
      registered_voters_total?: number;
    }
  ): TPS | null {
    const existing = this.getById(id);
    if (!existing) return null;

    const electionId = data.election_id !== undefined ? data.election_id : existing.election_id;
    const tpsNumber = data.tps_number !== undefined ? data.tps_number : existing.tps_number;
    const tpsCode = data.tps_code !== undefined ? data.tps_code : existing.tps_code;
    const province = data.province !== undefined ? data.province : existing.province;
    const cityRegency = data.city_regency !== undefined ? data.city_regency : existing.city_regency;
    const district = data.district !== undefined ? data.district : existing.district;
    const village = data.village !== undefined ? data.village : existing.village;
    const address = data.address !== undefined ? data.address : existing.address;
    const status = data.status !== undefined ? data.status : existing.status;
    const regVoters = data.registered_voters_total !== undefined ? data.registered_voters_total : existing.registered_voters_total;

    const stmt = db.prepare(`
      UPDATE tps
      SET election_id = ?, tps_number = ?, tps_code = ?, province = ?, city_regency = ?, 
          district = ?, village = ?, address = ?, status = ?, registered_voters_total = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    stmt.run(
      electionId,
      tpsNumber,
      tpsCode,
      province,
      cityRegency,
      district,
      village,
      address,
      status,
      regVoters,
      id
    );

    return this.getById(id);
  },

  delete(id: number): boolean {
    const existing = this.getById(id);
    if (!existing) return false;

    const stmt = db.prepare("DELETE FROM tps WHERE id = ?");
    stmt.run(id);
    return true;
  },
};
