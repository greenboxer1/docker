import {REST, Routes, ApplicationCommandOptionType, Client, IntentsBitField, managerToFetchingStrategyOptions, Guild, User, EmbedBuilder, time} from "discord.js"
import { Sequelize, DataTypes, UUID, json, DATE, Op, where } from "sequelize"
import moment from "moment"

//--------------------------------------------------------------------------------------------------------------------------------
//Настройки
//--------------------------------------------------------------------------------------------------------------------------------

const env = {
    guildId: '1238583008760692807',
    botId: '1237648540679798824',
    token: 'MTIzNzY0ODU0MDY3OTc5ODgyNA.G1xk8M.tMxg7bhgtFt3G5_S_rT5bi5YPQmSYhr6u05VSY',
}

//--------------------------------------------------------------------------------------------------------------------------------
//Инициализация базы данных
//--------------------------------------------------------------------------------------------------------------------------------
console.log('создание бд')
//Создание бд
const sequelize = new Sequelize('database', 'username', 'password', {
    host: 'localhost',
    dialect: 'sqlite',
    storage: 'database.sqlite',
    logging: false
})
console.log('Таблица сообщений')
//Таблица сообщений, входов и выходов в гс, онлайнов и оффлайнов
const Activity = sequelize.define('activity', {
    eventId: {
        type: DataTypes.INTEGER, 
        autoIncrement: true,
        primaryKey: true
    },
    userId: {
        type: DataTypes.STRING,
        allowNull: false
    },
    time: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    },
    type: {
        type: DataTypes.STRING,
        allowNull: false
    }, 
    content: {
        type: DataTypes.STRING,
        allowNull: true
    }
}, {timestamps: false,});
await Activity.sync({ alter: true })
//Таблица со всеми пользователями и их статистикой
console.log('Таблица пользователей')
const Users = sequelize.define('users', {
    userId: {
        type: DataTypes.STRING, 
        allowNull: false,
        primaryKey: true
    },
    userName: {
        type: DataTypes.STRING,
        allowNull: false
    },
    msgCount: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        allowNull: false
    },
    lastVoise: {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: new Date(0)
    }, 
    lastOnline: {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: new Date(0)
    },
    status: {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: null
    },
    fullStatus: {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: null
    }
}, {timestamps: false,});
await Users.sync({ alter: true })
console.log('Инициализация')
//Инициализация
await sequelize.authenticate();
console.log('закончена')

//--------------------------------------------------------------------------------------------------------------------------------
//Слеш команды регистрация / удаление
//--------------------------------------------------------------------------------------------------------------------------------

//Создание команд
const commands = [
    {
        name: 'stats',
        description: 'Показывает статистику человека',
        options: [
            {
                name: 'user',
                description: 'Ник',
                type: ApplicationCommandOptionType.User,
                required: true
            },
        ]
    },
];
const rest = new REST({ version: '10' }).setToken(env.token);

//Добавление созданных команд
(async () => {
    try {
        await rest.put(
            Routes.applicationCommands(env.botId),
            { body: commands }
        )
        console.log('[START] Slash команды обновлены')
    } catch (error) {
        console.log(`[ERROR] Ошибка обработки Slash команд: ${error}`)
    }
})();


//--------------------------------------------------------------------------------------------------------------------------------
//Бот
//--------------------------------------------------------------------------------------------------------------------------------

//Рендер объекта Date в тег дискорда с временем
const dateRenderDiscord = function(dateStr, type = 'static') {
    if (type === 'dynamic') {
        return `<t:${Date.parse(dateStr) / 1000}:R>`
    } else if (type === 'static') {
        return `<t:${Date.parse(dateStr) / 1000}:f>`
    }
}
//Преобразование млсек в (лет + дней + часов и тд)
const msecToTime = function(msec, format) {
    if (msec === null) {
        return '-'
    }
    const seconds = msec/1000
    const s = Math.floor(seconds % 60 % 60 % 24 % 365);
    const m = Math.floor(seconds / 60 % 60 % 24 % 365);
    const h = Math.floor(seconds / 60 / 60 % 24 % 365);
    const d = Math.floor(seconds / 60 / 60 / 24 % 365);
    const y = Math.floor(seconds / 60 / 60 / 24 / 365);
    if (format === 'day') {
        return `${h}ч ${m}м ${s}с`
    } if (format === 'year') {
        return `${y}л ${d}д  ${h}ч ${m}м ${s}с`
    }

}
//Если что-то не работает, скорее всего забыл вписать сюда нужный интенс
Date.now()
const client = new Client({
    intents: [
        IntentsBitField.Flags.Guilds,
        IntentsBitField.Flags.GuildMembers,
        IntentsBitField.Flags.GuildMessages,
        IntentsBitField.Flags.MessageContent,
        IntentsBitField.Flags.GuildVoiceStates,
        IntentsBitField.Flags.GuildPresences
    ]
})

client.on('ready', async (c) => {
    //Запуск & проверка серверов на вайтлист
    console.log(`[START] Letobot запущен на сервере: ${client.guilds.cache.map((guild) => guild.name)}`);
    const leaveServer = (guild) => {console.log(`[START] Бот вышел с сервера ${guild.name}, его нет в белом списке`); guild.leave()};
    client.guilds.cache.forEach((guild) => env.guildId === (guild.id) ? NaN : leaveServer(guild));
    //Обновление списка пользователей
    const guild = client.guilds.cache.get(env.guildId);
    const guildMembers = await guild.members.fetch();
    const guildMembersId = guildMembers.map((member) => member.user.id );
    const dbMembersId = (await Users.findAll()).map((member) => member.userId)
    //Добавление новых
    guildMembersId.map((member) => {
        if (!dbMembersId.includes(member)) {
            Users.create({ userId: member, userName: client.users.cache.get(member).username})
            console.log(`[START] В бд добавлен ${client.users.cache.get(member).username}`)
        }
    })
    //Удаление вышедших с сервера
    dbMembersId.map((member) => {
        if (!guildMembersId.includes(member)) {
            Users.destroy({where: {userId: member}, force: true})
            console.log(`[START] Из дб удален ${client.users.cache.get(member).username}`)
        }
    })
    console.log(`[START] Список пользователей обновлен`);

    //логирование всех пользователей при запуске
    guildMembers.forEach(async (member) => {
        const isInVoice = member.voice.channel !== null ? true : false ;
        const lastVoiceEvent = await Activity.findOne({where:{userId: member.id, type: ['join', 'out']}, order: [['time', 'DESC']]})
        if (lastVoiceEvent === null) {
            if (isInVoice === true) {
                await Activity.create({userId: member.id, time: Date.now(), type: 'join'})
                await Users.update({lastVoice: null}, {where: {userId: member.id}})
                console.log(`first[START] ${member.displayName} ${member.id} (activity_created: join)`)
            } else {
                await Activity.create({userId: member.id, time: Date.now(), type: 'out'})
                await Users.update({lastVoice: Date.now()}, {where: {userId: member.id}})
                console.log(`first[START] ${member.displayName}  ${member.id} (activity_created: out)`)
            }
        } else if (isInVoice === true) {
            if (lastVoiceEvent.type !== 'join') {
                await Activity.create({userId: member.id, time: Date.now(), type: 'join'})
                await Users.update({lastVoice: null}, {where: {userId: member.id}})
                console.log(`[START] ${member.displayName} (activity_created: join)`)
            }
        } else if (lastVoiceEvent.type !== 'out') {
                await Activity.create({userId: member.id, time: Date.now(), type: 'out'})
                await Users.update({lastVoice: Date.now()}, {where: {userId: member.id}})
                console.log(`[START] ${member.displayName} (activity_created: out)`)
        }
        
    })
})


//Добавить проверку при запуске бота: 
//чек всех кто есть в гс чатах, если последний эвент этого человека выход из гс, добавить вход, если последний эвент вход, ничего не делать
//чек статус всех людей, если последний эвент этого человека не отличается от полученного, ничего не менять, если отличается, поменять статус (фулл статус менять сразу без проверок)


//Логирование заходов в гс
client.on('voiceStateUpdate', async(oldState, newState) => {
    const voiseStatusNow = await Users.findOne({where: {userId: newState.member.id}})
    const createVoiceActivicy = async(type, lastVoice) => {
        console.log(`[LOG] ${newState.member.displayName} (activity_created: ${type})`);
        await Users.update({ lastVoise: lastVoice}, {where: {userId: newState.member.id}})
        await Activity.create({ userId: newState.member.id, type: type });
    }
    if (oldState.channel === null && newState.channel !== null && voiseStatusNow.lastVoise !== null) {
        await createVoiceActivicy('join', null)
    } else if (oldState.channel !== null && newState.channel === null && voiseStatusNow.lastVoise === null) {
        await createVoiceActivicy('out', Date.now())
    }
});
//Логирование статусов (онлайн офлайн, отошел)
client.on('presenceUpdate', async (oldPresence, newPresence) => {
    const member = newPresence.member;
    if (oldPresence !== null) {
        if (oldPresence.status !== newPresence.status) {
            //Запись идет в две таблицы (в активити все упрощается до офлайн и онлайн, в юзер 4 состояния)
            const writeStatusToDb = async(userId, status, fullStatus, lastOnline ) => {
                await Users.update({ fullStatus: fullStatus}, {where: {userId: userId}})
                const userFromDb = await Users.findOne({where: {userId: member.id}})
                if (  userFromDb.status !== status) {
                    await Activity.create({ userId: userId, type: 'status', content: status });
                    await Users.update({ lastOnline: lastOnline}, {where: {userId: userId}})
                    await Users.update({ status: status}, {where: {userId: userId}})
                    console.log(`[LOG] ${member.displayName} (activity created: ${status}) (status_changed: ${status}) (full_status_changed: ${fullStatus})`)
                    return 
                }
                console.log(`[LOG] ${member.displayName} (status: ${userFromDb.status}) (full_status_changed: ${fullStatus})`)
                return               
            }
            //Проверка на состояние. Исполнение функции выше
            switch (newPresence.status) {
                case "online":
                    await writeStatusToDb(member.id, 'online', 'online', null)
                    break
                case "dnd":
                    await writeStatusToDb(member.id, 'online', 'dnd', null)
                    break
                case "offline":
                    await writeStatusToDb(member.id, 'offline', 'offline', Date.now())
                    break
                case "idle":
                    await writeStatusToDb(member.id, 'offline', 'idle', Date.now())
                    break
            }
        }
    }

});
//Логирование сообщений
client.on('messageCreate', async (msg) => {
    console.log(`[LOG] ${msg.author.displayName} (activity_created: msg) (activity_content: ${msg.content}) `);
    await Activity.create({ userId: msg.author.id, type: 'msg', content: msg.content });
    const dbMsgCount = (await Users.findOne({where: { userId: msg.author.id}})).msgCount;
    await Users.update({ msgCount: dbMsgCount + 1},{ where: {userId: msg.author.id}});
});
//Команда статистики по человеку
client.on('interactionCreate', async(interaction) => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'stats') {
        const userId = interaction.options.get('user').value
        const userObj = client.users.cache.get(userId)
        console.log(`[LOG] ${interaction.user.displayName} (interaction_command: status ${userObj.displayName})`)
        const userFromDb = await Users.findOne({where:{userId: userId}});
        let userStatus = null;
        switch (userFromDb.fullStatus) {
            case 'offline':
                userStatus = `Оффлайн (был онлайн ${dateRenderDiscord(userFromDb.lastOnline, 'dynamic')})`
                break;
            case 'idle':
                userStatus = `Отошел (был онлайн ${dateRenderDiscord(userFromDb.lastOnline, 'dynamic')})`
                break;
            case 'dnd':
                userStatus = `Не беспокоить, деловой дахуя`
                break;
            default:
                userStatus = 'Онлайн'
                break;
        }
        const activity = userFromDb.lastVoise === null ? 'В гс' : `Не в гс (сидел ${userFromDb.lastVoise.getTime() === 0 ? 'никогда' : dateRenderDiscord(userFromDb.lastVoise, 'dynamic')})`
        const getOnline = async(time, format) => {
            //Достать из бд данные по id, по статус(онлайн офлайн, отошел) и по времени за последние 24 часа
            let filterDbOnline = await Activity.findAll({ where: {time: { [Op.gte]: moment().subtract(time, format).toDate() } ,userId: userId, content: ['offline','online']}})
            //Защита от пустой бд (возращает null если в бд мало данных)
            if (filterDbOnline.length < 1) {
                return null
            }
            //если начинается с offline или idle, отбросить его
            filterDbOnline[0].content === 'offline' ? filterDbOnline.shift() : NaN;
            //если заканчивается на online, добавить в конце date.now()
            filterDbOnline[filterDbOnline.length-1].content === 'online'? filterDbOnline.push({time: Date.now().toString(), content: 'offline'}): NaN;  
            //Собираем пары онлайн и офлайн, затем оффлайн - онлайн, в конце складываем все разницы 
            let filterDbOnlineResult = 0;
            for (let i = 0;i < filterDbOnline.length; i+= 2) {
                filterDbOnlineResult += (filterDbOnline[i+1].time - filterDbOnline[i].time)
            }
            return filterDbOnlineResult
        }

        const getVoiceOnline = async(time, format) => {
            let filterDbVoice = await Activity.findAll({ where: {time: { [Op.gte]: moment().subtract(time, format).toDate() } ,userId: userId, type: ['join', 'out']}})
            if (filterDbVoice.length < 2) {
                return null
            }
            filterDbVoice[0].type === 'out' ? filterDbVoice.shift() : NaN;
            filterDbVoice[filterDbVoice.length-1].type === 'join'? filterDbVoice.push({time: Date.now().toString(), type: 'out'}): NaN;  
            let filterDbVoiceResult = 0;
            for (let i = 0;i < filterDbVoice.length; i+= 2) {
                filterDbVoiceResult += (filterDbVoice[i+1].time - filterDbVoice[i].time)
            }
            return filterDbVoiceResult
        }
        const getMessageCount = async(time, format) => {
            let filterDbMessages = await Activity.findAll({ where: {time: { [Op.gte]: moment().subtract(time, format).toDate() } ,userId: userId, type: 'msg'}})
            return filterDbMessages.length
        }

        const getVoiceJoinCount = async(time, format) => {
            let filterDbVoiceJoin = await Activity.findAll({ where: {time: { [Op.gte]: moment().subtract(time, format).toDate() } ,userId: userId, type: 'join'}})
            return filterDbVoiceJoin.length
        }
        const reply = new EmbedBuilder()
        .setColor('ff7721')
        .setAuthor({ name: userObj.displayName, iconURL: userObj.avatarURL() })
        .setDescription(`
        **Статус:**  ${userStatus}
        **Активность:**  ${activity}

        __**За день**__
        ● **Онлайн:** ${msecToTime(await getOnline(1, 'days'), 'day')}
        ● **Сообщений:** ${await getMessageCount(1, 'days')}
        ● **Заходов в гс:** ${await getVoiceJoinCount(1, 'days')}
        ● **Онлайна в гс:** ${msecToTime(await getVoiceOnline(1, 'days'), 'day')}

        __**За все время**__
        ● **Онлайн:** ${msecToTime(await getOnline(10, 'years'), 'year')}
        ● **Сообщений:**  ${userFromDb.msgCount === null ? '-': userFromDb.msgCount}
        ● **Заходов в гс:**  ${await getVoiceJoinCount(10, 'years')}
        ● **Онлайна в гс:** ${msecToTime(await getVoiceOnline(10, 'years'), 'year')}
        `)
        interaction.reply({ embeds: [reply], ephemeral: true})
    }    
})
client.login(env.token);