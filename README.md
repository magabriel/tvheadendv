# Tvheadend viewer (Tvheadendv)

Copyright (c) 2012 Miguel Angel Gabriel (magabriel@gmail.com). All rights reserved.

Released under the GNU GPL V3. 

## Synopsis

This is a mobile web viewer for the excelent HTS Tvheadend {https://www.lonelycoder.com/tvheadend/} streaming server.

Tvheadend does not provide an adequate mobile version and there are no plans to implement one. There are both an official iPhone client and at least another unofficial one for Android {http://john-tornblom.github.com/TVHGuide}. 

I started this project as an excuse to teach myself jQuery Mobile. I would be happy if anyone finds it useful.

Screenshots are available in /doc/screenshots folder.

## Features

- Easy integration into TvHeadend installation.
- Show channel tags, channels and EPG.
- When in the channel or EPG list, tapping on an item will open the default video player to play the live stream directly from your server (I personally recommend the excellent MX Videoplayer in the Android platform). 

## Requirements

- A working installation of TvHeadend. 
- A mobile platform with a modern browser (tested under Androd 2.3 / 4.0 and stock browser / Dolphin browser).
- An external media player that can play streaming urls. 

## Installation

- Instructions are for Ubuntu. Not tested in other distributions. This explanation assumes that TvHeadend is installed in `/usr/share/tvheadend`, so adjust it according to your installation.
- Download everything under the repository's "public_html" folder and copy somewhere in the same machine that runs Tvheadend (say, "/home/me/apps/tvheadendv"). Do not forget to chmod 664 everything in there.
- From here you have two options (choose either one):

    1.- Make a symbolic link pointing TvHeadend to the directory containing the application:
    
            sudo ln -s /home/me/apps/tvheadendv/public_html /usr/share/tvheadend/src/webui/static/tvhv

    2.- Copy the contents of the public_html folder just downloaded to the right directory inside TvHeadend installation:
    
            sudo cp -r /home/me/apps/tvheadendv/public_html /usr/share/tvheadend/src/webui/static/tvhv
                
  Either way, after that you will be able to access the application opening {http://yourserver:9981/static/tvhv/index.html} from your mobile browser.
       
 

 




  

