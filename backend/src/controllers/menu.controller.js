const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Helper to get or create vendor profile
const getOrCreateVendorProfile = async (userId, role) => {
    try {
        // If not a vendor role, just try to find existing profile
        if (role !== 'VENDOR') {
            return await prisma.vendor.findUnique({ where: { userId } });
        }

        // For vendors, use upsert to get or create
        const user = await prisma.user.findUnique({ where: { id: userId } });
        const vendor = await prisma.vendor.upsert({
            where: { userId },
            update: {}, // Don't update anything if exists
            create: {
                userId,
                storeName: user?.name || 'My Store',
                approved: true
            }
        });

        return vendor;
    } catch (error) {
        console.error('Error in getOrCreateVendorProfile:', error);
        // If upsert fails, try just finding
        try {
            return await prisma.vendor.findUnique({ where: { userId } });
        } catch {
            return null;
        }
    }
};

// Get all menu items for the logged-in vendor
exports.getMenuItems = async (req, res) => {
    try {
        const vendor = await getOrCreateVendorProfile(req.user.id, req.user.role);

        // If not a vendor, return empty array (graceful for admin users)
        if (!vendor) {
            return res.json([]);
        }

        const items = await prisma.menuItem.findMany({
            where: { vendorId: vendor.id },
            orderBy: [
                { category: 'asc' },
                { name: 'asc' }
            ]
        });

        res.json(items);
    } catch (error) {
        console.error('Get menu items error:', error.message);
        // Return empty array on error to not break the UI
        res.json([]);
    }
};

// Create a new menu item
exports.createMenuItem = async (req, res) => {
    try {
        const { name, price, category } = req.body;

        if (!name || price === undefined) {
            return res.status(400).json({ error: 'Name and price are required' });
        }

        const vendor = await getOrCreateVendorProfile(req.user.id, req.user.role);

        if (!vendor) {
            return res.status(403).json({ error: 'Not a vendor' });
        }

        const item = await prisma.menuItem.create({
            data: {
                vendorId: vendor.id,
                name,
                price: parseFloat(price),
                category: category || 'General',
                available: true
            }
        });

        res.status(201).json(item);
    } catch (error) {
        console.error('Create menu item error:', error);
        res.status(500).json({ error: 'Failed to create menu item' });
    }
};

// Update a menu item
exports.updateMenuItem = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, price, category, available } = req.body;

        const vendor = await getOrCreateVendorProfile(req.user.id, req.user.role);

        if (!vendor) {
            return res.status(403).json({ error: 'Not a vendor' });
        }

        // Verify item belongs to this vendor
        const existing = await prisma.menuItem.findUnique({
            where: { id }
        });

        if (!existing || existing.vendorId !== vendor.id) {
            return res.status(404).json({ error: 'Menu item not found' });
        }

        const item = await prisma.menuItem.update({
            where: { id },
            data: {
                name: name !== undefined ? name : existing.name,
                price: price !== undefined ? parseFloat(price) : existing.price,
                category: category !== undefined ? category : existing.category,
                available: available !== undefined ? available : existing.available
            }
        });

        res.json(item);
    } catch (error) {
        console.error('Update menu item error:', error);
        res.status(500).json({ error: 'Failed to update menu item' });
    }
};

// Delete a menu item
exports.deleteMenuItem = async (req, res) => {
    try {
        const { id } = req.params;

        const vendor = await getOrCreateVendorProfile(req.user.id, req.user.role);

        if (!vendor) {
            return res.status(403).json({ error: 'Not a vendor' });
        }

        // Verify item belongs to this vendor
        const existing = await prisma.menuItem.findUnique({
            where: { id }
        });

        if (!existing || existing.vendorId !== vendor.id) {
            return res.status(404).json({ error: 'Menu item not found' });
        }

        await prisma.menuItem.delete({
            where: { id }
        });

        res.json({ message: 'Menu item deleted' });
    } catch (error) {
        console.error('Delete menu item error:', error);
        res.status(500).json({ error: 'Failed to delete menu item' });
    }
};

// Toggle item availability
exports.toggleAvailability = async (req, res) => {
    try {
        const { id } = req.params;

        const vendor = await getOrCreateVendorProfile(req.user.id, req.user.role);

        if (!vendor) {
            return res.status(403).json({ error: 'Not a vendor' });
        }

        const existing = await prisma.menuItem.findUnique({
            where: { id }
        });

        if (!existing || existing.vendorId !== vendor.id) {
            return res.status(404).json({ error: 'Menu item not found' });
        }

        const item = await prisma.menuItem.update({
            where: { id },
            data: {
                available: !existing.available
            }
        });

        res.json(item);
    } catch (error) {
        console.error('Toggle availability error:', error);
        res.status(500).json({ error: 'Failed to toggle availability' });
    }
};
