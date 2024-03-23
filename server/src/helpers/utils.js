const createConfig = (url, accessToken) => {
    return {
        method: 'GET',
        url: url.toString(),
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
    };
};

module.exports = { createConfig };
