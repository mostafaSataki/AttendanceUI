import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// POST /api/cards - Create a new card
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('userId');
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const { title, description, listId } = await request.json();

    if (!title || !listId) {
      return NextResponse.json(
        { error: 'Title and list ID are required' },
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
    console.error('Create card error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}