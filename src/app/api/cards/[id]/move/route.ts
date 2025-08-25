import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

interface RouteParams {
  params: {
    id: string;
  };
}

// PUT /api/cards/[id]/move - Move a card to a different list and/or position
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const userId = request.headers.get('userId');
    const { id: cardId } = params;

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const { newListId, position } = await request.json();

    if (!newListId) {
      return NextResponse.json(
        { error: 'New list ID is required' },
        { status: 400 }
      );
    }

    // Check if card exists and user has access to it
    const existingCard = await db.card.findFirst({
      where: {
        id: cardId,
        list: {
          project: {
            ownerId: userId
          }
        }
      },
      include: {
        list: true
      }
    });

    if (!existingCard) {
      return NextResponse.json(
        { error: 'Card not found or access denied' },
        { status: 404 }
      );
    }

    // Check if new list exists and user has access to it
    const newList = await db.list.findFirst({
      where: {
        id: newListId,
        project: {
          ownerId: userId
        }
      }
    });

    if (!newList) {
      return NextResponse.json(
        { error: 'Target list not found or access denied' },
        { status: 404 }
      );
    }

    // If moving to the same list, just update position
    if (existingCard.listId === newListId) {
      const updatedCard = await db.card.update({
        where: {
          id: cardId
        },
        data: {
          position: position !== undefined ? position : existingCard.position
        }
      });

      return NextResponse.json(
        { message: 'Card position updated successfully', card: updatedCard },
        { status: 200 }
      );
    }

    // Moving to a different list
    const targetPosition = position !== undefined ? position : await getNextPosition(newListId);

    // Update the card with new list and position
    const updatedCard = await db.card.update({
      where: {
        id: cardId
      },
      data: {
        listId: newListId,
        position: targetPosition
      }
    });

    return NextResponse.json(
      { message: 'Card moved successfully', card: updatedCard },
      { status: 200 }
    );
  } catch (error) {
    console.error('Move card error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper function to get the next position in a list
async function getNextPosition(listId: string): Promise<number> {
  const lastCard = await db.card.findFirst({
    where: {
      listId
    },
    orderBy: {
      position: 'desc'
    }
  });

  return lastCard ? lastCard.position + 1 : 0;
}