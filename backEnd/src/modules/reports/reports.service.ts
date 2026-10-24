import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as ExcelJS from 'exceljs';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const PDFDocument = require('pdfkit');
import { Booking } from '../../entities/booking.entity';
import { Agent } from '../../entities/agent.entity';
import { Client } from '../../entities/client.entity';
import { WalletTransaction } from '../../entities/wallet-transaction.entity';
import { BookingStatus, WalletTxType } from '../../common/enums/domain.enums';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class ReportsService {
  private reportDownloadMap = new Map<string, number>();

  constructor(
    @InjectRepository(Booking)
    private bookingRepo: Repository<Booking>,
    @InjectRepository(Agent)
    private agentRepo: Repository<Agent>,
    @InjectRepository(Client)
    private clientRepo: Repository<Client>,
    @InjectRepository(WalletTransaction)
    private txRepo: Repository<WalletTransaction>,
    private auditService: AuditService,
  ) {}

  // Formula-injection protection (FR-RPT-07)
  sanitizeFormula(val: any): any {
    if (typeof val === 'string') {
      const trimmed = val.trim();
      if (/^[=+\-@\t\r]/.test(trimmed)) {
        return `'${trimmed}`;
      }
    }
    return val;
  }

  async getDailyOperationalReport(dateStr?: string) {
    const targetDate = dateStr ? new Date(dateStr) : new Date();
    const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));

    // Bookings created today
    const bookingsToday = await this.bookingRepo
      .createQueryBuilder('b')
      .leftJoinAndSelect('b.destination', 'd')
      .leftJoinAndSelect('b.client', 'c')
      .leftJoinAndSelect('c.user', 'cu')
      .leftJoinAndSelect('b.agent', 'a')
      .leftJoinAndSelect('a.user', 'au')
      .where('b.created_at >= :startOfDay AND b.created_at <= :endOfDay', {
        startOfDay,
        endOfDay,
      })
      .getMany();

    // Approved sales today
    const salesRaw = await this.bookingRepo
      .createQueryBuilder('b')
      .select('SUM(b.total_price)', 'total')
      .where('b.approved_at >= :startOfDay AND b.approved_at <= :endOfDay', {
        startOfDay,
        endOfDay,
      })
      .getRawOne();
    const approvedSales = parseFloat(salesRaw?.total || '0');

    // Penalties collected today
    const penaltyRaw = await this.bookingRepo
      .createQueryBuilder('b')
      .select('SUM(b.penalty_fee)', 'total')
      .where('b.cancelled_at >= :startOfDay AND b.cancelled_at <= :endOfDay', {
        startOfDay,
        endOfDay,
      })
      .getRawOne();
    const penaltiesCollected = parseFloat(penaltyRaw?.total || '0');

    // Commissions credited today
    const commRaw = await this.txRepo
      .createQueryBuilder('t')
      .select('SUM(t.amount)', 'total')
      .where('t.type = :type', { type: WalletTxType.COMMISSION_CREDIT })
      .andWhere('t.created_at >= :startOfDay AND t.created_at <= :endOfDay', {
        startOfDay,
        endOfDay,
      })
      .getRawOne();
    const commissionsCredited = parseFloat(commRaw?.total || '0');

    // New clients registered today
    const newClients = await this.clientRepo
      .createQueryBuilder('c')
      .where('c.created_at >= :startOfDay AND c.created_at <= :endOfDay', {
        startOfDay,
        endOfDay,
      })
      .getCount();

    return {
      date: startOfDay.toISOString().split('T')[0],
      totalBookingsRequested: bookingsToday.length,
      approvedSales,
      penaltiesCollected,
      commissionsCredited,
      newClientsRegistered: newClients,
      bookings: bookingsToday,
    };
  }

  async getBookingsReport(filters: {
    startDate?: string;
    endDate?: string;
    status?: BookingStatus;
    destinationId?: string;
    agentId?: string;
  }) {
    const query = this.bookingRepo
      .createQueryBuilder('b')
      .leftJoinAndSelect('b.destination', 'd')
      .leftJoinAndSelect('b.client', 'c')
      .leftJoinAndSelect('c.user', 'cu')
      .leftJoinAndSelect('b.agent', 'a')
      .leftJoinAndSelect('a.user', 'au')
      .orderBy('b.created_at', 'DESC');

    if (filters.startDate) {
      query.andWhere('b.created_at >= :start', { start: new Date(filters.startDate) });
    }
    if (filters.endDate) {
      query.andWhere('b.created_at <= :end', { end: new Date(filters.endDate) });
    }
    if (filters.status) {
      query.andWhere('b.status = :status', { status: filters.status });
    }
    if (filters.destinationId) {
      query.andWhere('b.destination_id = :destId', { destId: filters.destinationId });
    }
    if (filters.agentId) {
      query.andWhere('b.agent_id = :agentId', { agentId: filters.agentId });
    }

    return query.getMany();
  }

  async exportToExcel(
    filters: any,
    actorId?: string,
  ): Promise<Buffer> {
    const bookings = await this.getBookingsReport(filters);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'ASK Tour & Travel Agency Management System';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Bookings Operational Report');

    sheet.columns = [
      { header: 'Booking Ref', key: 'ref', width: 14 },
      { header: 'Client Name', key: 'client', width: 22 },
      { header: 'Client Email', key: 'email', width: 26 },
      { header: 'Destination', key: 'destination', width: 26 },
      { header: 'Travel Date', key: 'date', width: 14 },
      { header: 'Travelers', key: 'travelers', width: 10 },
      { header: 'Total (ETB)', key: 'total', width: 16 },
      { header: 'Status', key: 'status', width: 14 },
      { header: 'Penalty (ETB)', key: 'penalty', width: 14 },
      { header: 'Refund (ETB)', key: 'refund', width: 14 },
      { header: 'Agent Name', key: 'agent', width: 20 },
      { header: 'Agent Referral Code', key: 'referral_code', width: 22 },
      { header: 'Booking Channel', key: 'origin', width: 24 },
      { header: 'Created At', key: 'created', width: 20 },
    ];

    // Style header row
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF8C4E1C' }, // Ethiopian travel amber/ochre
    };

    let totalSum = 0;
    let penaltySum = 0;
    let refundSum = 0;

    bookings.forEach((b) => {
      const total = Number(b.total_price);
      const penalty = Number(b.penalty_fee);
      const refund = Number(b.refund_amount);

      totalSum += total;
      penaltySum += penalty;
      refundSum += refund;

      const hasAgent = Boolean(b.agent?.referral_code || b.agent_id);
      const agentRefCode = b.agent?.referral_code || 'N/A';
      const agentName = b.agent?.user?.name || (hasAgent ? 'Partner Agent' : 'Direct Traveler');
      const originChannel = hasAgent
        ? `Agent Partner Referral (${agentRefCode})`
        : 'Direct Website / Organic';

      sheet.addRow({
        ref: this.sanitizeFormula(`#${b.id.substring(0, 8).toUpperCase()}`),
        client: this.sanitizeFormula(b.client?.user?.name || 'N/A'),
        email: this.sanitizeFormula(b.client?.user?.email || 'N/A'),
        destination: this.sanitizeFormula(b.destination?.title || 'N/A'),
        date: b.travel_date,
        travelers: b.travelers,
        total: total,
        status: b.status,
        penalty: penalty,
        refund: refund,
        agent: this.sanitizeFormula(agentName),
        referral_code: this.sanitizeFormula(agentRefCode),
        origin: this.sanitizeFormula(originChannel),
        created: new Date(b.created_at).toISOString().split('T')[0],
      });
    });

    // Totals row
    const totalRow = sheet.addRow({
      ref: 'TOTAL',
      client: '',
      email: '',
      destination: '',
      date: '',
      travelers: '',
      total: totalSum,
      status: '',
      penalty: penaltySum,
      refund: refundSum,
      agent: '',
      referral_code: '',
      origin: '',
      created: '',
    });
    totalRow.font = { bold: true };

    await this.auditService.log({
      actorId,
      action: 'REPORT_EXPORT_XLSX',
      entityType: 'Report',
      after: { rowCount: bookings.length },
    });

    return (await workbook.xlsx.writeBuffer()) as unknown as Buffer;
  }

  async exportToPdf(filters: any, actorName = 'Admin', actorId?: string): Promise<Buffer> {
    const bookings = await this.getBookingsReport(filters);

    const filterKey = `${filters?.startDate || ''}_${filters?.endDate || ''}_${filters?.status || 'ALL'}_${filters?.destinationId || ''}`;
    const previousDownloads = this.reportDownloadMap.get(filterKey) || 0;
    const isFirstDownload = previousDownloads === 0;
    const reportMark = isFirstDownload ? 'ORIGINAL' : 'COPY';
    this.reportDownloadMap.set(filterKey, previousDownloads + 1);

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 36, size: 'A4' });
      const buffers: Buffer[] = [];

      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', async () => {
        const pdfData = Buffer.concat(buffers);
        await this.auditService.log({
          actorId,
          action: 'REPORT_EXPORT_PDF',
          entityType: 'Report',
          after: { rowCount: bookings.length, reportMark, downloadNumber: previousDownloads + 1 },
        });
        resolve(pdfData);
      });
      doc.on('error', (err) => reject(err));

      // Header Banner with Issuance Mark (ORIGINAL vs COPY)
      doc.rect(36, 36, 523, 56).fill('#1C1917');
      doc.fontSize(15).font('Helvetica-Bold').fillColor('#FFFFFF').text('ASK DIGITAL TECHNOLOGIES', 48, 46);
      doc.fontSize(8.5).font('Helvetica').fillColor('#F59E0B').text('Tour & Travel Agency — Commercial & Operational Ledger', 48, 64);
      doc.fontSize(7.5).font('Helvetica').fillColor('#D6D3D1').text(`Generated on: ${new Date().toUTCString()} | Prepared for: ${actorName}`, 48, 76);

      const badgeBg = isFirstDownload ? '#065F46' : '#991B1B';
      const badgeBorder = isFirstDownload ? '#34D399' : '#F87171';
      doc.roundedRect(440, 46, 105, 22, 5).fillAndStroke(badgeBg, badgeBorder);
      doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#FFFFFF').text(
        isFirstDownload ? '● ORIGINAL' : '● COPY',
        440, 52.5, { align: 'center', width: 105 }
      );

      // Background Watermark: ORIGINAL or COPY
      doc.save();
      doc.rotate(-30, { origin: [297, 420] });
      if (isFirstDownload) {
        doc.fontSize(60).font('Helvetica-Bold').fillColor('#059669', 0.05);
        doc.text('ORIGINAL', 140, 395, { align: 'center', width: 314 });
      } else {
        doc.fontSize(72).font('Helvetica-Bold').fillColor('#DC2626', 0.08);
        doc.text('COPY', 160, 390, { align: 'center', width: 274 });
      }
      doc.restore();

      doc.y = 104;
      doc.moveDown(0.5);

      // Table Header
      const tableTop = doc.y;
      doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#8C4E1C');
      doc.text('Ref', 36, tableTop);
      doc.text('Client', 86, tableTop);
      doc.text('Destination', 170, tableTop);
      doc.text('Agent Code', 285, tableTop);
      doc.text('Date', 370, tableTop);
      doc.text('Status', 430, tableTop);
      doc.text('Total (ETB)', 480, tableTop, { align: 'right', width: 75 });

      doc.moveTo(36, tableTop + 14).lineTo(555, tableTop + 14).strokeColor('#8C4E1C').stroke();

      let y = tableTop + 20;
      doc.font('Helvetica').fontSize(7.5).fillColor('#333333');

      let totalPdfRevenue = 0;
      if (bookings.length === 0) {
        doc.text('No bookings found for the selected filter criteria.', 36, y);
      } else {
        bookings.slice(0, 100).forEach((b) => {
          if (y > 740) {
            doc.addPage();
            y = 40;
          }

          const agentCode = b.agent?.referral_code ? b.agent.referral_code : 'Direct (No Code)';

          totalPdfRevenue += Number(b.total_price || 0);
          doc.text(`#${b.id.substring(0, 7).toUpperCase()}`, 36, y);
          doc.text(b.client?.user?.name || 'N/A', 86, y, { width: 80, lineBreak: false });
          doc.text(b.destination?.title || 'N/A', 170, y, { width: 110, lineBreak: false });
          doc.text(agentCode, 285, y, { width: 80, lineBreak: false });
          doc.text(b.travel_date, 370, y);
          doc.text(b.status, 430, y);
          doc.text(`${Number(b.total_price).toFixed(2)}`, 480, y, { align: 'right', width: 75 });

          y += 18;
        });

        // Totals divider & line
        y += 6;
        doc.moveTo(36, y).lineTo(555, y).strokeColor('#cccccc').stroke();
        y += 8;
        doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#8C4E1C');
        doc.text(`TOTAL (${bookings.length} Bookings):`, 170, y);
        doc.text(`${totalPdfRevenue.toFixed(2)} ETB`, 480, y, { align: 'right', width: 75 });
      }

      doc.end();
    });
  }
}
