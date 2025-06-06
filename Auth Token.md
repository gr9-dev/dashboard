Getting Authentication Token
Note that in order to use our API, you have to generate an authentication token first. To do that you need authenticate using your user's CloudCall credentials and you will receive JWT token back
Please be aware of differences in typeparameter. There are two possible values:
account - regular user, typically username is your phone number
customer - admin, typically username is your email address
Please be aware of differences URL for Authentication. There are two possible values:
https://ng-api.uk.cloudcall.com - UK platform for UK, Australia and Pacific
https://ng-api.us.cloudcall.com - US platform for the Americas
Example curl request:
curl --location --request POST 'https://ng-api.uk.cloudcall.com/v3/auth/login' \
--header 'Content-Type: application/x-www-form-urlencoded' \
# [string] The type of user it is either account or customer 
--data-urlencode 'type=account' \
# [string] The username, email or number for the user wishing to log in.
--data-urlencode 'username=000000000' \
# [string] The password for the user.
--data-urlencode 'password=Password'