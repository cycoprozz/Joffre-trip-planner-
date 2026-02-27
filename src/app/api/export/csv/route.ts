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
    startTime: '2024-01-15T08:00:00Z',
    endTime: '2024-01-15T08:45:00Z',
    breakMinutes: 0,
    dayCount: 1,
    clientName: 'Acme Corp',
    notes: '',
    status: 'COMPLETED',
    computedPay: 25,
    finalPay: 25,
  },
  {
    id: '2',
    date: '2024-01-15',
    tripType: 'DIRECTED_HOURLY',
    serviceArea: undefined,
    pickupDatetime: '2024-01-15T10:00:00Z',
    pickupAddress: undefined,
    dropoffAddress: undefined,
    startTime: '2024-01-15T10:00:00Z',
    endTime: '2024-01-15T14:30:00Z',
    breakMinutes: 30,
    dayCount: 1,
    clientName: 'City Shuttle',
    notes: 'Airport runs',
    status: 'COMPLETED',
    computedPay: 80,
    finalPay: 80,
  },
];

// GET /api/export/csv - Export trips as CSV
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const dateFrom = searchParams.get('dateFrom');
  const dateTo = searchParams.get('dateTo');
  const status = searchParams.get('status');

  let filtered = [...trips];

  if (dateFrom) {
    filtered = filtered.filter(t => t.date >= dateFrom);
  }
  if (dateTo) {
    filtered = filtered.filter(t => t.date <= dateTo);
  }
  if (status) {
    filtered = filtered.filter(t => t.status === status);
  }

  // CSV Header
  const headers = [
    'Date',
    'Trip Type',
    'Service Area',
    'Pickup Address',
    'Dropoff Address',
    'Start Time',
    'End Time',
    'Break Minutes',
    'Day Count',
    'Client Name',
    'Notes',
    'Status',
    'Computed Pay',
    'Final Pay',
  ];

  // CSV Rows
  const rows = filtered.map(trip => [
    trip.date || '',
    trip.tripType || '',
    trip.serviceArea || '',
    trip.pickupAddress || '',
    trip.dropoffAddress || '',
    trip.startTime || '',
    trip.endTime || '',
    trip.breakMinutes?.toString() || '0',
    trip.dayCount?.toString() || '1',
    trip.clientName || '',
    trip.notes || '',
    trip.status || '',
    trip.computedPay?.toString() || '0',
    trip.finalPay?.toString() || '0',
  ]);

  // Create CSV content
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(',')),
  ].join('\n');

  // Return as downloadable file
  const response = new NextResponse(csvContent, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="trips_${dateFrom || 'all'}_${dateTo || 'all'}.csv"`,
    },
  });

  return response;
}
