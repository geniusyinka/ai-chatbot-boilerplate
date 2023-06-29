// Loader.js

import React from 'react';
import FallingLines from "react-loader-spinner"
import BeatLoader from 'react-spinners'

const Loader = () => {
  // loader implementation   
  <div>

    <FallingLines
      color="#4fa94d"
      width="100"
      visible={true}
      ariaLabel='falling-lines-loading'
    />
         {/* <BeatLoader color="#36d7b7" /> */}
  </div>
};

export default Loader;
