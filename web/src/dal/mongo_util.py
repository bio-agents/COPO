__author__ = 'felixshaw'
import pymongo
from bson import ObjectId

from django.conf import settings


def get_collection_ref(collection_name):
    return pymongo.MongoClient(settings.MONGO_HOST, settings.MONGO_PORT)[settings.MONGO_DB][collection_name]

def get_mongo_client():
    return pymongo.MongoClient(settings.MONGO_HOST, settings.MONGO_PORT)

def to_mongo_id(id):
    return ObjectId(id)


# web templates take a list or dictionary object as their context, so mongodb cursor objects
# need to be converted before being used in templates
def to_django_context(cursor):
    records = []
    for r in cursor:
        records.append(r.to_json_type())
    return records


def cursor_to_list(cursor):
    records = []
    for r in cursor:
        records.append(r)
    return records


def verify_doc_type(doc):
    data = []
    if isinstance(doc, dict):
        if doc["result"]:
            return doc["result"][0]["data"]
    elif isinstance(doc, pymongo.command_cursor.CommandCursor):
        data = list(doc)
        if data:
            return data[0]["data"]
    return data

def change_mongo_id_format_to_standard(cursor):
    # changes ids of records in a cursor to be 'id' instead of '_id'
    l = cursor_to_list(cursor)
    for r in l:
        r['id'] = r.pop('_id')
    return l

def convert_text(data):
    # change text to shortform :=: iri
    l = list()
    for r in data:
        r['text'] = r['shortform'] + ' :-: ' + r['@id']
        l.append(r)
    return l