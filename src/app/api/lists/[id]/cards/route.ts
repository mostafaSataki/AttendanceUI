import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

interface RouteParams {
  params: {
    id: string;
  };
}

// GET /api/lists/[id]/cards - Get all cards for a specific list
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const userId = request.headers.get('userId');
    const { id: listId } = params;

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Check if list exists and user has access to it
    const list = await db.list.findFirst({
      where: {
        id: listId,
        project: {
          ownerId: userId
        }
      }
    });

    if (!list) {
      return NextResponse.json(
        { error: 'List not found or access denied' },
        { status: 404 }
      );
    }

    const cards = await db.card.findMany({
      where: {
        listId
      },
      orderBy: {
        position: 'asc'
      }
    });

    return NextResponse.json({ cards });
  } catch (error) {
    console.error('Get list cards error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/lists/[id]/cards - Create a new card in a specific list
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const userId = request.headers.get('userId');
    const { id: listId } = params;

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const { title, description } = await request.json();

    if (!title) {
      return NextResponse.json(
        { error: 'Card title is required' },
        { status: 400 }
      );
    }

    // Check if list exists and user has access to it
    const list = await db.list.findFirst({
      where: {
        id: listId,
        project: {
          ownerId: userId
        }
      }
    });

    if (!list) {
      return NextResponse.json(
        { error: 'List not found or access denied' },
        { status: 404 }
      );
    }

    // Get the highest position in the list to place the new card at the end
    const lastCard = await db.card.findFirst({
      where: {
        listId
      },
      orderBy: {
        position: 'desc'
      }
    });

    const position = lastCard ? lastCard.position + 1 : 0;

    const card = await db.card.create({
      data: {
        title,
        description: description || '',
        listId,
        position
      }
    });

    return NextResponse.json(
      { message: 'Card created successfully', card },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create list card error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}