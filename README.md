# Tvheadend viewer (Tvheadendv)

Copyright (c) 2012 Miguel Angel Gabriel (magabriel@gmail.com). All rights reserved.

Released under the GNU GPL V3. 
---

## Synopsis

This is a mobile viewer for the excelent [HTS Tvheadend]{https://www.lonelycoder.com/tvheadend/} streaming server.

Tvheadend does not provide an adequate mobile version and there is no plans to implement one. There is an official iPhone client that does pretty much this but Android users are left behind. Hence the need for a mobile viewer that is web-based.

I started this project as an excuse to teach myself jQuery Mobile. I would be happy if anyone finds it useful.

## Features

- Easy installation (or not too difficult, anyway).
- Show channel tags, channels and EPG.
- When in the channel or EPG list, tapping on an item will open the default video player to play the live stream directly from your server (I personally recommend the excelent MX Videoplayer in the Android platform). 

## Requirements

- Linux platform (sorry, not tested in Windows) with Apache and PHP. For simplicity you should use the same machine where Tvheadend lives, but is up to you to use another one. The application can work from any computer in the same network. 
- A mobile platform with a modern browser (tested under Androd 2.3 and Dolphin browser).


## Installation

- Instructions are for Ubuntu. Not tested in other distributions.
- Download everything under the repository's "public_html" folder and copy somewhere in the same machine that runs Tvheadend (say, "/home/me/apps/tvheadendv"). Do not forget to chmod 664 everything in there.
- Configure Apache to provide access to the application. This can be achieved in two ways:
    - **The easy one:** Just make a symbolic link pointing to the folder containing the application:
    
            sudo ln -s /home/me/apps/tvheadendv/public_html /var/www/tvheadendv
        
    - **The not-so-easy-but-more-correct one:** Configure a virtual server:

        Create a file /etc/apache2/sites-available/tvheadendv with the following contents:
        
            Alias /tvheadendv "/home/me/apps/tvheadendv/public_html"
            <Directory "/home/me/apps/tvheadendv/public_html">
              DirectoryIndex index.html
              Options Indexes FollowSymLinks MultiViews
              AllowOverride All
              Order allow,deny
              Allow from all
            </Directory> 
          
        Make a symbolic link to activate it:
        
            sudo ln -s /etc/apache2/sites-available/tvheadendv /etc/apache2/sites-enabled/tvheadendv

        And restart Apache.
        
  Either way, after that you will be able to access the application opening {http://yourserver/tvheadendv} from your mobile browser.
  
  
## The technical stuff

The application interacts with Tvheadend via its JSON api to access channels, channel tags and EPG information. Unfortunately, for the browser to be able to receive data from a server the requester Javascript program must have been downloaded from the same server (it is called the "same origin" restriction and it means that protocol, hostname and port must be equal). There is a solution to overcome this security restriction: use JSONP instead of plain-old JSON. But now we have the problem that Tvheadend does not implement JSONP...

The solution is to use a proxy (a PHP script) that executes on the same or another server, that will receive the JSONP request and forward a JSON request to Tvheadend, receive the JSON response from Tvheadend and formward it back to us in JSONP form.  Where should this proxy be installed? Anywhere in the network, but the easy solution is using the same directory than Tvheadendv. It is called jsonp-proxy.php and you will find it there if you look closely. 
    
    
## TO DO

- Generate an Android and iPhone native application using PhoneGap.
    
    
 

 




  

