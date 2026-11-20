// Run in a disposable database or use a dedicated demo user ID.
const encore = db.getSiblingDB('encore');
encore.preferences.createIndex({userId:1},{unique:true});
const userId = -Number(Date.now());
encore.preferences.insertOne({userId,genres:['Jazz'],artists:[],categories:[],budget:2500,section:'Balcony',accessible:false,updatedAt:new Date()});
printjson(encore.preferences.findOne({userId}));
encore.preferences.updateOne({userId},{$set:{budget:3000,updatedAt:new Date()}});
printjson(encore.preferences.aggregate([{$match:{userId}},{$unwind:'$genres'},{$group:{_id:'$genres',avgBudget:{$avg:'$budget'}}}]).toArray());
encore.preferences.deleteOne({userId});
printjson(encore.preferences.findOne({userId}));
