function sendApiResponse(res, status, statusCode, message, data = null, logId, pagination = null , token = null) {
    const response = {
        "status": status,
        "statusCode": statusCode,
        "message": message,
        "logId": logId,
        
       
    };
    if (data !== null) {
        response["data"] = data;
        if (pagination !== null) {
            response["data"]["pagination"] = pagination;
        }
    }
    if(token !== null){
        response.token = token
    }

    res.status(statusCode).json(response);
}


function sendFailureResponse(res, statusCode, message, logId) {
    const response = {
        "status": "error",
        "statusCode": statusCode,
        "message": message,
        "logId": logId
    };



    res.status(statusCode).json(response);
}

module.exports = {sendApiResponse , sendFailureResponse}