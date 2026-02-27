import { NextRequest, NextResponse } from 'next/server';

// In-memory store reference (shared with main route)
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

// GET /api/trips/[id] - Get a single trip
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const trip = trips.find(t => t.id === id);
  
  if (!trip) {
    return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
  }
  
  return NextResponse.json(trip);
}

// PUT /api/trips/[id] - Update a trip
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const index = trips.findIndex(t => t.id === id);
  
  if (index === -1) {
    return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
  }
  
  try {
    const body = await request.json();
    trips[index] = {
      ...trips[index],
      ...body,
      updatedAt: new Date().toISOString(),
    };
    return NextResponse.json(trips[index]);
  } catch (error) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}

// DELETE /api/trips/[id] - Delete a trip
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const index = trips.findIndex(t => t.id === id);
  
  if (index === -1) {
    return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
  }
  
  trips.splice(index, 1);
  return NextResponse.json({ success: true });
}
