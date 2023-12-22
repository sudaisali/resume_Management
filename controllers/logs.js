const {Log} = require('../models/logs')
const {sendFailureResponse} = require('../utils/standaradresponse')

const getAllLogs = async (req, res) => {
    const logId = res.getHeader('logId');
    try {
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 10;
        const offset = (page - 1) * limit;
        const method = req.query.method; 
        const id = req.query.id; 
        const filters = {};
        if (method) {
            filters.method = method;
        }
        if (id) {
            filters.logId = id;
        }
        filters.method = 'POST';
        const logs = await Log.findAll({
            attributes:['logNumber', 'name', 'email', 'activity', 'createdAt'],
            where: filters, 
            order: [['createdAt', 'DESC']],
            offset,
            limit,
        });
        if (!logs || logs.length === 0) {
            return sendFailureResponse(res, 400, 'No Logs Found', logId);
        }
        const totalLogs = await Log.count({ where: filters }); 
        const totalPages = Math.ceil(totalLogs / limit);
        const hasNextPage = page < totalPages;
        const hasPrevPage = page > 1;
        const nextLink = hasNextPage ? `api/log/get-logs?page=${page + 1}&limit=${limit}` : null;
        const prevLink = hasPrevPage ? `api/log/get-logs?page=${page - 1}&limit=${limit}` : null;
        res.status(200).json({
            status: 'success',
            statusCode: 200,
            message: 'Logs Shown Successfully',
            logId: logId,
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
        return sendFailureResponse(res, 400, error.message, logId);
    }
};

module.exports = {getAllLogs}