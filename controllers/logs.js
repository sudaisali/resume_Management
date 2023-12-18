const {Log} = require('../models/logs')


const getAllLogs = async (req, res) => {
    try {
       
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 10;
        const offset = (page - 1) * limit;
        const logs = await Log.findAll({
            offset,
            limit,
        });

        if (!logs) {
            return res.status(400).json({
                status: "failed",
            });
        }
        const totalLogs = await Log.count();
        const totalPages = Math.ceil(totalLogs / limit);
        const hasNextPage = page < totalPages;
        const hasPrevPage = page > 1;
        const nextLink = hasNextPage ? `api/getlogs?page=${page + 1}&limit=${limit}` : null;
        const prevLink = hasPrevPage ? `api/getlogs?page=${page - 1}&limit=${limit}` : null;

        res.status(200).json({
            status: "success",
            data: logs,
            pagination: {
                totalLogs,
                page,
                totalPages,
                hasNextPage,
                hasPrevPage,
                nextLink,
                prevLink,
            },
        });
    } catch (error) {
        res.status(400).json({
            message: error.message,
        });
    }
};




module.exports = {getAllLogs}