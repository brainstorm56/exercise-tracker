import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
dotenv.config();
const app = express()

// Middleware to parse JSON data
app.use(express.json());
app.use(cors())
app.use('/public', express.static(`${process.cwd()}/public`));


// Middleware to parse form data (urlencoded)
app.use(express.urlencoded({ extended: true }));

// connect to database
mongoose.connect(process.env.MONGO_URI);

// User schema and model
const userSchema = mongoose.Schema({
  username:{
    type: String,
    required: true
  }
})
const User = mongoose.model('User',userSchema);


// Record Schema and model
const recordSchema = mongoose.Schema({
  user_id:{
    type: String,
    required: true
  },
  username:{
    type: String
  },
  description:{
    type: String,
    required: true
  },
  duration:{
    type: Number,
    required: true,
    validate: {
      validator: function(value) {
        return !isNaN(value);
      },
      message: 'Invalid number'
    }
  },
  date:{
    type: Date,
    validate: {
      validator: function(value) {
        if(!value){return true;}
        return !isNaN(value.getTime());
      },
      message: 'Invalid date'
    }
  }
})
const Record = mongoose.model('Record',recordSchema);

//create a new user
async function create_user(username)
{
  const user = new User({username:username})
  const savedUser = await user.save()
  return savedUser;
}

// create a new user with post
app.post('/api/users',async (req,res)=>{
  let username = req.body.username;
  let user = await create_user(username);
  res.json({
    username: user.username,
    _id: user._id
  });
})


// create a new record
async function create_record(user, user_info){
  let dateObject = -1;
  if(!user_info.date)
  {
    dateObject = new Date();
  }
  if(dateObject===(-1))
  {
    dateObject = new Date(user_info.date);
  }
  const record = new Record({   
    user_id:user._id,
    username: user.username,
    description: user_info.description,
    duration: user_info.duration,
    date: dateObject
  })
    const savedrecord = await record.save();
    return savedrecord
}

// get logs of a user with GET

app.get('/api/users/:_id/logs',async (req,res)=>{
  const _id = req.params._id;
  const { from, to, limit } = req.query;
  if (mongoose.Types.ObjectId.isValid(_id)) {
    let user = await User.findById(_id);
    if(user)
    {
      let query = {user_id:_id};
      if(from||to)
      {
        query.date = {};
        if(from)
        {
          query.date.$gte = new Date(from);
        }
        if(to)
        {
          query.date.$lte = new Date(to);
        }
      }
      try{
        let records = await Record.find(query)
        .sort({date:1})
        .limit(limit && !isNaN(parseInt(limit)) ? parseInt(limit) : undefined)
        .lean();
        let modifiedRecords = records.map(record => {
          query.date = {};
          let newRecord = {};
          newRecord.description = record.description;
          newRecord.duration = record.duration;
          newRecord.date = new Date(record.date).toDateString();
          return newRecord;
        });
        res.json({
          _id: user._id,
          username: user.username,
          count: modifiedRecords.length,
          log: modifiedRecords
        })
      }
      catch(error){
        res.json(error.message);
      }
    }
    else
    {
      res.json({});
    }
  } 
  else {
    console.error("Invalid _id");
  }
})


// get a list of all users with GET

app.get('/api/users',async(req,res)=>{
  const userArray = await User.find({});
  res.json(userArray);
})


// add a record from _id, description, duration and date


app.post('/api/users/:_id/exercises',async (req,res)=>{
  const _id = req.params._id;
  if (mongoose.Types.ObjectId.isValid(_id)) {
    const user = await User.findById(_id);

    if(user)
    {
      try {
        const record = await create_record(user,req.body);
        res.json({
          _id: record.user_id,
          username: record.username,
          date: record.date.toDateString(),
          duration: record.duration,
          description: record.description
        })
      } catch (error) {
        res.json(error.message);
      }
    }
    else{
      res.json({});
    }
  } 
  else {
    console.error("Invalid _id");
  }
})

// get request at root

app.get('/', (req, res) => {
  res.sendFile(process.cwd() + '/views/index.html')
});


const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
