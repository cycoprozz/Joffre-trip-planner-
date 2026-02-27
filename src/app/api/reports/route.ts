import { NextRequest, NextResponse } from 'next/server';

// In-memory store (shared)
let trips: any[] = [
  {
    id: '1',
    date: '2024-01-15',
    tripType: 'POINT_TO_POINT',
    serviceArea: 'ATLANTA_IN_PERIMETER',
    pickupDatetime: '2024-01-15T08:00:00Z',
    pickupAddress: '123 Main St, Atlanta, GA',
    dropoffAddress: '456 Peachtree Rd, Atlanta, GA',
    status: 'COMPLETED',
    computedPay: 25,
    finalPay: 25,
  },
  {
    id: '2',
    date: '2024-01-15',
    tripType: 'DIRECTED_HOURLY',
    pickupDatetime: '2024-01-15T10:00:00Z',
    startTime: '2024-01-15T10:00:00Z',
    endTime: '2024-01-15T14:30:00Z',
    breakMinutes: 30,
    status: 'COMPLETED',
    computedPay: 80,
    finalPay: 80,
  },
];

// GET /api/reports - Get earnings summary and breakdown
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const period = searchParams.get('period') || 'all';
  const dateFrom = searchParams.get('dateFrom');
  const dateTo = searchParams.get('dateTo');

  // Filter trips by date range
  let filtered = [...trips];
  
  if (dateFrom) {
    filtered = filtered.filter(t => t.date >= dateFrom);
  }
  if (dateTo) {
    filtered = filtered.filter(t => t.date <= dateTo);
  }

  // Calculate totals
  const totalEarnings = filtered.reduce((sum, t) => sum + (t.finalPay || 0), 0);
  const totalTrips = filtered.length;
  
  // Breakdown by trip type
  const breakdownByType: Record<string, { count: number; total: number }> = {};
  filtered.forEach(trip => {
    const type = trip.tripType;
    if (!breakdownByType[type]) {
      breakdownByType[type] = { count: 0, total: 0 };
    }
    breakdownByType[type].count++;
    breakdownByType[type].total += trip.finalPay || 0;
  });

  // Breakdown by date
  const breakdownByDate: Record<string, { count: number; total: number }> = {};
  filtered.forEach(trip => {
    const date = trip.date;
    if (!breakdownByDate[date]) {
      breakdownByDate[date] = { count: 0, total: 0 };
    }
    breakdownByDate[date].count++;
    breakdownByDate[date].total += trip.finalPay || 0;
  });

  // Status breakdown
  const breakdownByStatus: Record<string, { count: number; total: number }> = {};
  filtered.forEach(trip => {
    const status = trip.status;
    if (!breakdownByStatus[status]) {
      breakdownByStatus[status] = { count: 0, total: 0 };
    }
    breakdownByStatus[status].count++;
    breakdownByStatus[status].total += trip.finalPay || 0;
  });

  return NextResponse.json({
    period: {
      type: period,
      dateFrom,
      dateTo,
    },
    summary: {
      totalEarnings,
      totalTrips,
      averagePerTrip: totalTrips > 0 ? totalEarnings / totalTrips : 0,
    },
    breakdownByType,
    breakdownByDate,
    breakdownByStatus,
    trips: filtered,
  });
}
