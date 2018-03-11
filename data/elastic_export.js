const es = require('elasticsearch');
const client = new es.Client({
    host: 'localhost:9200',

});

async function delete_index(name) {
    try {
        console.log('DEBUG: Deleting ' + name + ' index...');
        return await client.indices.delete({ index: name });
    }
    catch (error) {
        console.log('ERROR: Could not delete ' + name + ' index: ' + error);
    }
}

function construct_body(operations, transform, index_name, index_type) {
    let body = [];
    for (let i = 0; i < operations.length; i++) {
        let es_index_statement = {
            index: {
                _index: index_name,
                _type: index_type,
                _id: i
            }
        };
        body.push(es_index_statement);
        body.push(transform(operations[i]));
    }
    return body;
}

async function bulk_add(operations, transform, index_name, index_type) {
    let body = construct_body(operations, transform, index_name, index_type);

    let errors = 0

    try {
        console.log('DEBUG: Bulk loading...')
        const result = await client.bulk({
            body: body
        });

        result.items.forEach(i => {
            if (i.index.error) {
                console.log(JSON.stringify(i));
            }
        })

        return result;
    }
    catch (error) {
        console.log(error);
    }
}

async function create_index(name) {
    console.log('DEBUG: Creating ' + name + ' index...');
    let created = await client.indices.exists({ index: name });
    if (!created) {
        return await client.indices.create({ index: name });
    }
    else {
        console.log('ERROR: Index ' + name + ' already existed; deletion failed.');
    }
}

async function reload_index(operations, transform, index_name, index_type) {
    try {
        await delete_index(index_name);
        await create_index(index_name);
        await bulk_add(operations, transform, index_name, index_type);
        let stats = await client.indices.stats({ index: index_name });
        let count = stats.indices[index_name].total.indexing.index_total;
        console.log('DEBUG: ' + count + ' documents added.');
    } catch (error) {
        console.log('ERROR: ' + error);
    }
}

module.exports = {
    reload_index: reload_index,
    bulk_add: bulk_add,
}
