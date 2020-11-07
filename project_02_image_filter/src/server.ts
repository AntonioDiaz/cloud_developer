import express, {Request, Response} from 'express';
import bodyParser from 'body-parser';
import {filterImageFromURL, deleteLocalFiles} from './util/util';
import { nextTick } from 'process';

(async () => {

  // Init the Express application
  const app = express();

  // Set the network port
  const port = process.env.PORT || 8082;
  
  // Use the body parser middleware for post requests
  app.use(bodyParser.json());

  app.get( "/filteredimage/", ( req: Request, res: Response ) => {
    let { image_url } = req.query;
    if ( !image_url ) {
      return res.status(400).send("image_url is required");
    }    
    filterImageFromURL(image_url)
      .then(imagePath => {
        return res.status(200).sendFile(imagePath, err => {
          if (!err) {
            let filesList: string[] = [imagePath];
            deleteLocalFiles(filesList);
          }
        });
      }).catch(() => {
        return res.status(422).send("error when processing the image");
      });
  } );  


  // Root Endpoint
  // Displays a simple message to the user
  app.get( "/", async ( req: Request, res: Response ) => {
    res.send("try GET /filteredimage?image_url={{}}")
  } );
  

  // Start the Server
  app.listen( port, () => {
      console.log( `server running http://localhost:${ port }` );
      console.log( `press CTRL+C to stop server` );
  } );
})();