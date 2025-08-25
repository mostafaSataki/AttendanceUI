import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

interface RouteParams {
  params: {
    id: string;
  };
}

// PUT /api/lists/[id] - Update a list
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const userId = request.headers.get('userId');
    const listId = params.id;

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const { title, position } = await request.json();

    if (!title) {
      return NextResponse.json(
        { error: 'List title is required' },
        { status: 400 }
      );
    }

    // Check if list exists and user has access to it
    const existingList = await db.list.findFirst({
      where: {
        id: listId,
        project: {
          ownerId: userId
        }
      }
    });

    if (!existingList) {
      return NextResponse.json(
        { error: 'List not found or access denied' },
        { status: 404 }
      );
    }

    const list = await db.list.update({
      where: {
        id: listId
      },
      data: {
        title,
        position: position !== undefined ? position : existingList.position
      },
      include: {
        cards: {
          orderBy: {
            position: 'asc'
          }
        }
      }
    });

    return NextResponse.json(
      { message: 'List updated successfully', list },
      { status: 200 }
    );
  } catch (error) {
    console.error('Update list error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/lists/[id] - Delete a list
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const userId = request.headers.get('userId');
    const listId = params.id;

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Check if list exists and user has access to it
    const existingList = await db.list.findFirst({
      where: {
        id: listId,
        project: {
          ownerId: userId
        }
      }
    });

    if (!existingList) {
      return NextResponse.json(
        { error: 'List not found or access denied' },
        { status: 404 }
      );
    }

    await db.list.delete({
      where: {
        id: listId
      }
    });

    return NextResponse.json(
      { message: 'List deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Delete list error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}