Meteor.methods({
	createDirectMessage(username, team) {
		check(username, String);
		check(team, String);

		// TODO add security to only send team based private messages when both users are on the provided team

		if (!Meteor.userId()) {
			throw new Meteor.Error('error-invalid-user', 'Invalid user', {
				method: 'createDirectMessage',
			});
		}

		const me = Meteor.user();

		if (!me.username) {
			throw new Meteor.Error('error-invalid-user', 'Invalid user', {
				method: 'createDirectMessage',
			});
		}

		if (RocketChat.settings.get('Message_AllowDirectMessagesToYourself') === false && me.username === username) {
			throw new Meteor.Error('error-invalid-user', 'Invalid user', {
				method: 'createDirectMessage',
			});
		}

		if (!RocketChat.authz.hasPermission(Meteor.userId(), 'create-d')) {
			throw new Meteor.Error('error-not-allowed', 'Not allowed', {
				method: 'createDirectMessage',
			});
		}

		const to = RocketChat.models.Users.findOneByUsername(username);

		if (!to) {
			throw new Meteor.Error('error-invalid-user', 'Invalid user', {
				method: 'createDirectMessage',
			});
		}
		/* ttrc TODO - Logic
		* The follow security addition was added just August 2018.
		*    I decided to comment out the addition until ttrc has proven to be stable
		*    after the major work to get it updated to v69.  James Craig Sept 7 2018
		*
		*		if (!RocketChat.authz.hasPermission(to._id, 'view-d-room')) {
		*	throw new Meteor.Error('error-not-allowed', 'Target user not allowed to receive messages', {
		*		method: 'createDirectMessage',
		*	});
		* }
		*
		*/

		const rid = [me._id, to._id].sort().join('') + team;

		const now = new Date();

		// Make sure we have a room
		RocketChat.models.Rooms.upsert({
			_id: rid,
		}, {
			$set: {
				usernames: [me.username, to.username],
			},
			$setOnInsert: {
				t: 'd',
				msgs: 0,
				ts: now,
				usersCount: 2,
				team,
				name: [me._id, to._id].sort().join(''),
			},
		});

		const myNotificationPref = RocketChat.getDefaultSubscriptionPref(me);

		// Make user I have a subcription to this room
		const upsertSubscription = {
			$set: {
				ts: now,
				ls: now,
				open: true,
			},
			$setOnInsert: {
				fname: to.name,
				name: to.username,
				t: 'd',
				alert: false,
				unread: 0,
				userMentions: 0,
				groupMentions: 0,
				customFields: me.customFields,
				u: {
					_id: me._id,
					username: me.username,
				},
				...myNotificationPref,
				team,
			},
		};

		if (to.active === false) {
			upsertSubscription.$set.archived = true;
		}

		RocketChat.models.Subscriptions.upsert({
			rid,
			$and: [{ 'u._id': me._id }], // work around to solve problems with upsert and dot
		}, upsertSubscription);

		const toNotificationPref = RocketChat.getDefaultSubscriptionPref(to);

		RocketChat.models.Subscriptions.upsert({
			rid,
			$and: [{ 'u._id': to._id }], // work around to solve problems with upsert and dot
		}, {
			$setOnInsert: {
				fname: me.username,
				name: me.username,
				t: 'd',
				open: false,
				alert: false,
				unread: 0,
				userMentions: 0,
				groupMentions: 0,
				customFields: to.customFields,
				u: {
					_id: to._id,
					username: to.username,
				},
				...toNotificationPref,
				team,
			},
		});

		return {
			rid,
		};
	},
});

RocketChat.RateLimiter.limitMethod('createDirectMessage', 10, 60000, {
	userId(userId) {
		return !RocketChat.authz.hasPermission(userId, 'send-many-messages');
	},
});
