import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

interface RouteParams {
  params: {
    id: string;
  };
}

// PUT /api/cards/[id] - Update a card
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const userId = request.headers.get('userId');
    const cardId = params.id;

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const { title, description, position, listId } = await request.json();

    if (!title) {
      return NextResponse.json(
        { error: 'Card title is required' },
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
      }
    });

    if (!existingCard) {
      return NextResponse.json(
        { error: 'Card not found or access denied' },
        { status: 404 }
      );
    }

    // If moving to a different list, check if user has access to the target list
    if (listId && listId !== existingCard.listId) {
      const targetList = await db.list.findFirst({
        where: {
          id: listId,
          project: {
            ownerId: userId
          }
        }
      });

      if (!targetList) {
        return NextResponse.json(
          { error: 'Target list not found or access denied' },
          { status: 404 }
        );
      }
    }

    const card = await db.card.update({
      where: {
        id: cardId
      },
      data: {
        title,
        description: description !== undefined ? description : existingCard.description,
        position: position !== undefined ? position : existingCard.position,
        listId: listId || existingCard.listId
      }
    });

    return NextResponse.json(
      { message: 'Card updated successfully', card },
      { status: 200 }
    );
  } catch (error) {
    console.error('Update card error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/cards/[id] - Delete a card
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const userId = request.headers.get('userId');
    const cardId = params.id;

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
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
      }
    });

    if (!existingCard) {
      return NextResponse.json(
        { error: 'Card not found or access denied' },
        { status: 404 }
      );
    }

    await db.card.delete({
      where: {
        id: cardId
      }
    });

    return NextResponse.json(
      { message: 'Card deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Delete card error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}