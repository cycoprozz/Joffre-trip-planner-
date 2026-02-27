import { NextRequest, NextResponse } from 'next/server';

// In-memory store for demo (replace with Prisma in production)
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

// GET /api/trips - List all trips
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

  return NextResponse.json(filtered);
}

// POST /api/trips - Create a new trip
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const newTrip = {
      id: Date.now().toString(),
      date: body.date || new Date().toISOString().split('T')[0],
      tripType: body.tripType,
      serviceArea: body.serviceArea,
      pickupDatetime: body.pickupDatetime,
      pickupAddress: body.pickupAddress,
      dropoffAddress: body.dropoffAddress,
      startTime: body.startTime,
      endTime: body.endTime,
      breakMinutes: body.breakMinutes || 0,
      dayCount: body.dayCount || 1,
      clientName: body.clientName,
      notes: body.notes,
      status: body.status || 'SCHEDULED',
      computedPay: body.computedPay || 0,
      finalPay: body.finalPay || 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    trips.push(newTrip);
    return NextResponse.json(newTrip, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}
